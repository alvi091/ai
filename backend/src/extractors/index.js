/*
 * Extraction orchestrator — ties together: URL validation → site detection →
 * HTML fetch → metadata harvest (JSON-LD/OG/microdata) → DOM extraction →
 * normalization. Returns a canonical `ExtractedProduct` + review slate + provenance.
 */

const { validate } = require('./urlValidator');
const { fetchPage } = require('./fetcher');
const cheerio = require('cheerio');
const { harvest } = require('./metadataHarvester');
const { extractDom } = require('./domExtractor');
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

function dedupeReviews(list) {
  const seen = new Set();
  const out = [];
  for (const r of list) {
    const key = String(r.text || r.title || '').slice(0, 120).toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out.slice(0, 300);
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
  const fetched = await fetchPage(v.url);
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
  try {
    const $ = cheerio.load(html);
    meta = harvest($, finalUrl);
  } catch {
    meta = {};
  }

  step('Reading page structure');
  let ogExtra = { ogDescription: null, metaDescription: null };
  let dom = {};
  try {
    const $ = cheerio.load(html);
    ogExtra = ogExtras($);
    dom = extractDom(html, v.site.selectors);
  } catch {
    dom = {};
  }

  const merged = {
    ...mergeExtraction(meta, dom, ogExtra),
    ogDescription: ogExtra.ogDescription || meta.description,
    metaDescription: ogExtra.metaDescription,
    delivery: null,
  };

  step('Cleaning & normalizing');
  const product = normalize(merged, { site: v.site, baseUrl: finalUrl });

  step('Collecting reviews');
  const ldReviews = fromJsonLd(meta.reviews || [], 200);
  const domReviews = fromDom(html, v.site.selectors, config.crawler.maxReviews);
  const reviews = dedupeReviews([...ldReviews, ...domReviews]).slice(0, config.crawler.maxReviews);

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