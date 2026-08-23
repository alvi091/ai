/*
 * Extraction orchestrator — ties together: URL validation → site detection →
 * HTML fetch → metadata harvest (JSON-LD/OG/microdata) → DOM extraction →
 * normalization. Returns a canonical `ExtractedProduct` + review slate + provenance.
 */

const { validate } = require('./urlValidator');
const { fetchPage, fetchPageSmart } = require('./fetcher');
const cheerio = require('cheerio');
const { harvest } = require('./metadataHarvester');
const { extractDom } = require('./domExtractor');
const { extractStructured } = require('./structuredExtractor');
const { scrapeReviews } = require('./reviewScraper');
const { fetchFlipkartReviews, extractProductId, acquireFlipkartSlot, DEFAULT_SPACING_MS } = require('./flipkartReviews');
const { fetchMyntraReviews, extractMyntraStyleId } = require('./myntraReviews');
const { fetchAmazonReviews, extractAsin, reviewsFromAmazonHtml } = require('./amazonReviews');
const { fetchAjioReviews, extractAjioProductCode } = require('./ajioReviews');
const { fetchNykaaReviews, extractNykaaProductId } = require('./nykaaReviews');
const { fetchMeeshoReviews, extractMeeshoProductId } = require('./meeshoReviews');
const { normalize } = require('./normalizer');
const { fromJsonLd, fromDom } = require('./reviewExtractor');
const config = require('../config');

function mergeExtraction(meta, dom, ogExtra = {}) {
  const description = pickNonEmpty(
    ...longestFirst([meta.description, dom.description, ogExtra.ogDescription, ogExtra.metaDescription])
  );
  return {
    title: meta.title || dom.title,
    brand: meta.brand || dom.brand,
    price: meta.price != null ? meta.price : dom.price,
    originalPrice: meta.originalPrice != null ? meta.originalPrice : dom.originalPrice,
    priceRaw: meta.price != null && meta.currency ? String(meta.price) : dom.price != null ? String(dom.price) : '',
    currency: meta.currency || dom.currency,
    image: meta.image || dom.image,
    images: meta.images && meta.images.length ? meta.images : dom.images,
    url: meta.url,
    sku: meta.sku || null,
    model: meta.model || null,
    category: meta.category || null,
    description,
    features: dom.features && dom.features.length ? dom.features : [],
    specs: dom.specs || [],
    availability: meta.availabilityStaged || dom.availability,
    availabilityText: dom.availability,
    seller: dom.seller,
    ratingValue: meta.ratingValue != null ? meta.ratingValue : dom.ratingValue,
    ratingCount: meta.ratingCount != null ? meta.ratingCount : dom.ratingCount,
    starDistribution: dom.starDistribution || null,
  };
}

// order strings by length (longest first) so the richest copy wins
function longestFirst(values) {
  return values
    .filter((v) => v != null && String(v).trim())
    .sort((a, b) => String(b).length - String(a).length);
}

function pickNonEmpty(...vals) {
  return vals.find((v) => v != null && String(v).trim());
}

function ogExtras($) {
  const get = (k) => $(`meta[property="${k}"], meta[name="${k}"]`).attr('content') || null;
  return { ogDescription: get('og:description'), metaDescription: get('description') };
}

function dedupeReviews(list, cap = 300) {
  const seen = new Set();
  const out = [];
  for (const r of list) {
    const text = String(r.text || r.title || '').trim().toLowerCase();
    // Prefer the marketplace review id (unique per comment) so genuinely
    // distinct reviews that share identical short text are NOT collapsed
    // (e.g. two different users both writing "good"). Fall back to a composite
    // of author + full text + rating + date — a true duplicate must match all.
    const idPart = r._id ? String(r._id) : '';
    const composite = idPart
      || `${String(r.author || '')}::${text}::${r.rating}::${String(r.date || '')}`;
    if (!composite || seen.has(composite)) continue;
    seen.add(composite);
    out.push(r);
  }
  return cap > 0 ? out.slice(0, cap) : out;
}

function looksLikeBlocked(html, status) {
  if (status === 403 || status === 429 || status === 503) return true;
  const lower = String(html || '').toLowerCase().slice(0, 6000);
  return (
    (lower.includes('captcha') && lower.includes('robot')) ||
    lower.includes('access denied') ||
    lower.includes('verify you are human') ||
    lower.includes('unusual traffic')
  );
}

async function extractProductFromUrl(rawUrl, onProgress) {
  const step = (msg) => onProgress && onProgress(msg);

  step('Validating & detecting website');
  const v = await validate(rawUrl);
  if (!v.ok) {
    return { ok: false, kind: 'validation', error: v.error, status: v.status, site: v.site || null, url: v.url, short: v.short };
  }
  if (!v.isProduct) {
    return {
      ok: false,
      kind: 'not_a_product_page',
      error: 'This is a valid website but not a product page \u2014 paste the link to an actual product (title + price + buy button).',
      url: v.url, status: v.status, site: v.site,
    };
  }

  step('Fetching the product page');
  const fetched = await fetchPageSmart(v.url, v.site);
  if (!fetched.ok) {
    return {
      ok: false,
      kind: 'crawl_failed',
      error: fetched.error || 'Could not reach the product page (too slow or blocked).',
      url: fetched.url || v.url,
      status: fetched.status,
      site: v.site,
    };
  }
  const html = fetched.html;
  const finalUrl = fetched.url || v.url;

  step('Extracting structured metadata');
  let meta = {};
  let structured = {};
  let ogExtra = { ogDescription: null, metaDescription: null };
  let dom = {};
  try {
    const $ = cheerio.load(html);
    meta = harvest($, finalUrl);
    structured = extractStructured(html, { siteId: v.site.id, baseUrl: finalUrl });
    ogExtra = ogExtras($);
    dom = extractDom(html, v.site.selectors);
  } catch {
    meta = {};
    structured = {};
    ogExtra = {};
    dom = {};
  }

  const merged = {
    ...mergeExtraction(meta, dom, ogExtra),
    // Layer client-side structured data (__NEXT_DATA__) over the DOM harvest.
    ...(structured.title ? { title: structured.title } : {}),
    ...(structured.brand ? { brand: structured.brand } : {}),
    ...(structured.price != null ? { price: structured.price } : {}),
    ...(structured.originalPrice != null ? { originalPrice: structured.originalPrice } : {}),
    ...(structured.currency ? { currency: structured.currency } : {}),
    ...(structured.images && structured.images.length ? { images: structured.images, image: structured.image } : {}),
    ...(structured.sku ? { sku: structured.sku } : {}),
    ...(structured.category ? { category: structured.category } : {}),
    ...(structured.rating != null ? { ratingValue: structured.rating } : {}),
    ...(structured.ratingCount != null ? { ratingCount: structured.ratingCount } : {}),
    ...(structured.reviewCount != null ? { reviewCount: structured.reviewCount } : { reviewCount: meta.reviewCount != null ? meta.reviewCount : null }),
    ...(structured.description ? { description: structured.description } : {}),
    reviewsCount: structured.reviewCount != null ? structured.reviewCount : (meta.reviewCount != null ? meta.reviewCount : (structured.ratingCount != null ? structured.ratingCount : (meta.ratingCount || dom.ratingCount))),
    ogDescription: ogExtra.ogDescription || meta.description,
    metaDescription: ogExtra.metaDescription,
    delivery: null,
  };

  step('Cleaning & normalizing');
  const product = normalize(merged, { site: v.site, baseUrl: finalUrl });

  step('Collecting reviews');
  const ldReviews = fromJsonLd(meta.reviews || [], 200);
  const domReviews = fromDom(html, v.site.selectors, config.crawler.maxReviews);
  const embeddedReviews = [...ldReviews, ...(structured.reviews || [])];
  const baseReviews = dedupeReviews([...embeddedReviews, ...domReviews]).slice(0, config.crawler.maxReviews);

  let reviews = baseReviews;
  // Dedicated per-store review fetchers run FIRST (they use paginated APIs
  // that return far richer data than the generic DOM scraper). Only stores
  // without a dedicated fetcher fall through to the generic review scrape.
  if (v.site.id === 'flipkart') {
    // Flipkart's product page shell does not server-render review comments, so
    // pull the full review slate through their reviews API (paced + retried).
    step('Reading Flipkart reviews');
    const productId = extractProductId(finalUrl, html);
    const fetched = await fetchFlipkartReviews({
      productId,
      url: finalUrl,
      max: config.crawler.flipkartReviews,
      onSpacing: (m) => step(m),
    });
    if (fetched && fetched.length) {
      reviews = dedupeReviews([...fetched, ...baseReviews]);
      if (config.crawler.flipkartReviews > 0 && reviews.length > config.crawler.flipkartReviews) {
        reviews = reviews.slice(0, config.crawler.flipkartReviews);
      }
    }
  } else if (v.site.id === 'myntra') {
    // Myntra server-renders only a handful of "top" reviews — pull every
    // comment through their reviews API (paginated; falls back to the embedded
    // copy when the API is down or the product has no written reviews).
    step('Reading Myntra reviews');
    const styleId = extractMyntraStyleId(finalUrl);
    const fetched = await fetchMyntraReviews({
      styleId,
      html,
      max: config.crawler.myntraReviews,
      onSpacing: (m) => step(m),
    });
    if (fetched && fetched.length) {
      reviews = dedupeReviews([...fetched, ...baseReviews]);
      if (config.crawler.myntraReviews > 0 && reviews.length > config.crawler.myntraReviews) {
        reviews = reviews.slice(0, config.crawler.myntraReviews);
      }
    }
  } else if (v.site.id === 'amazon') {
    // Amazon.in embeds ~10 review cards in the SSR page regardless of count,
    // and the deep product-reviews pages are signin-walled from this network —
    // parse whatever cards exist in the fetched HTML and merge them in.
    step('Reading Amazon reviews');
    const asin = extractAsin(finalUrl);
    const fromHtml = asin ? reviewsFromAmazonHtml(html, 'amazon-page') : [];
    const fetched = await fetchAmazonReviews({
      asin,
      url: finalUrl,
      html,
      max: config.crawler.amazonReviews,
      onSpacing: (m) => step(m),
    });
    const slate = [...(fetched || fromHtml)];
    if (slate.length) {
      reviews = dedupeReviews([...slate, ...baseReviews]);
      if (config.crawler.amazonReviews > 0 && reviews.length > config.crawler.amazonReviews) {
        reviews = reviews.slice(0, config.crawler.amazonReviews);
      }
    }
  } else if (v.site.id === 'ajio') {
    step('Reading Ajio reviews');
    const productCode = extractAjioProductCode(finalUrl);
    const fetched = await fetchAjioReviews({
      productCode,
      html,
      max: config.crawler.ajioReviews,
      onSpacing: (m) => step(m),
    });
    if (fetched && fetched.length) {
      reviews = dedupeReviews([...fetched, ...baseReviews]);
      if (config.crawler.ajioReviews > 0 && reviews.length > config.crawler.ajioReviews) {
        reviews = reviews.slice(0, config.crawler.ajioReviews);
      }
    }
  } else if (v.site.id === 'nykaa') {
    step('Reading Nykaa reviews');
    const productId = extractNykaaProductId(finalUrl);
    const fetched = await fetchNykaaReviews({
      productId,
      html,
      max: config.crawler.nykaaReviews,
      onSpacing: (m) => step(m),
    });
    if (fetched && fetched.length) {
      reviews = dedupeReviews([...fetched, ...baseReviews]);
      if (config.crawler.nykaaReviews > 0 && reviews.length > config.crawler.nykaaReviews) {
        reviews = reviews.slice(0, config.crawler.nykaaReviews);
      }
    }
  } else if (v.site.id === 'meesho') {
    step('Reading Meesho reviews');
    const productId = extractMeeshoProductId(finalUrl);
    const fetched = await fetchMeeshoReviews({
      productId,
      html,
      max: config.crawler.meeshoReviews,
      onSpacing: (m) => step(m),
    });
    if (fetched && fetched.length) {
      reviews = dedupeReviews([...fetched, ...baseReviews]);
      if (config.crawler.meeshoReviews > 0 && reviews.length > config.crawler.meeshoReviews) {
        reviews = reviews.slice(0, config.crawler.meeshoReviews);
      }
    }
  } else if (v.site.renderWait) {
    // For other JS-rendered storefronts (noon, namshi, carrefour, etc.),
    // do a deep review scrape on the rendered page.
    step('Reading reviews');
    reviews = await scrapeReviews(finalUrl, {
      site: v.site,
      embeddedReviews: baseReviews,
      max: config.crawler.maxReviews,
    });
  }
  if (config.crawler.flipkartReviews === 0 && v.site.id === 'flipkart') {
    reviews = dedupeReviews(reviews, 0); // keep full (uncapped) slate for flipkart
  } else if (config.crawler.myntraReviews === 0 && v.site.id === 'myntra') {
    reviews = dedupeReviews(reviews, 0); // keep full slate for myntra too
  } else if (config.crawler.amazonReviews === 0 && v.site.id === 'amazon') {
    reviews = dedupeReviews(reviews, 0); // keep full slate for amazon
  } else if (config.crawler.ajioReviews === 0 && v.site.id === 'ajio') {
    reviews = dedupeReviews(reviews, 0); // keep full slate for ajio
  } else if (config.crawler.nykaaReviews === 0 && v.site.id === 'nykaa') {
    reviews = dedupeReviews(reviews, 0); // keep full slate for nykaa
  } else if (config.crawler.meeshoReviews === 0 && v.site.id === 'meesho') {
    reviews = dedupeReviews(reviews, 0); // keep full slate for meesho
  } else {
    reviews = dedupeReviews(reviews).slice(0, config.crawler.maxReviews);
  }

  const blocked = looksLikeBlocked(html, fetched.status);
  const extraction = {
    sourceUrl: finalUrl,
    inputUrl: v.inputUrl,
    short: v.short || false,
    shortenedHost: v.shortenedHost || null,
    resolved: v.resolved || false,
    site: { id: v.site.id, label: v.site.label, host: v.site.host },
    blocked,
    fetchedStatus: fetched.status,
    rendered: fetched.rendered || false,
    metadata: {
      hasJsonLd: Boolean(meta.title || meta.price != null || meta.ratingCount != null),
      titleFromStructured: Boolean(meta.title),
      priceFromStructured: meta.price != null,
      reviewCountFromStructured: meta.ratingCount != null,
    },
    quality: product.quality,
    warnings: product.quality.level === 'sparse' ? ['Very little product data could be extracted from this page.'] : [],
    htmlSize: html.length,
  };

  return {
    ok: true,
    product,
    reviews,
    extraction,
    validation: v,
  };
}

module.exports = { extractProductFromUrl };