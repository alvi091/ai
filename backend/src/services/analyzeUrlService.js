/*
 * URL Analysis service — the bridge between the crawler (extractors/) and the
 * existing analytics + report engines.
 *
 * Pipeline: validate + crawl the pasted URL → normalize product & reviews →
 * feed into productAnalytics (worth, decision, risk, suitability, reviews) +
 * reportBuilder (deterministic + optional LLM report) → enrich with the
 * intelligence layer (price, spec explanations, review dimensions, personas) →
 * return one report object ready for the frontend.
 */

const { extractProductFromUrl } = require('../extractors');
const { analyzeProduct } = require('./productAnalytics');
const { generateReport } = require('./reportBuilder');
const { getAll } = require('./marketplaceCatalog');
const { priceIntelligence } = require('../intelligence/priceIntelligence');
const { explainSpecs } = require('../intelligence/specsIntelligence');
const reviewAnalyzer = require('../intelligence/reviewAnalyzer');
const { derive: deriveSentiment } = require('../intelligence/sentimentDetails');
const personaEngine = require('../intelligence/personaEngine');
const config = require('../config');

function hashCode(str) {
  let h = 0;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function toSamples(reviews) {
  return (reviews || []).map((r, i) => ({
    id: `url-review-${i}`,
    comment: String(r.text || r.body || r.title || r.review || '').slice(0, 2000),
    title: r.title || '',
    rating: Number(r.rating) || 3,
    author: r.author || null,
    date: r.date || null,
    helpful_votes: Number(r.helpful_votes || r.helpful || 0) || 0,
    verified: Boolean(r.verified),
  }));
}

function averageRating(samples) {
  const ratings = samples.map((r) => Number(r.rating)).filter((n) => n > 0 && n <= 5);
  if (!ratings.length) return null;
  return Math.round((ratings.reduce((s, v) => s + v, 0) / ratings.length) * 10) / 10;
}

function breakdownFromReviews(samples) {
  const ratings = samples.map((r) => Number(r.rating)).filter((n) => n > 0 && n <= 5);
  if (!ratings.length) return null;
  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  ratings.forEach((r) => {
    const k = Math.round(r);
    if (counts[k] !== undefined) counts[k] += 1;
  });
  const total = ratings.length;
  return {
    '5_best': Math.round((counts[5] / total) * 100),
    '4_good': Math.round((counts[4] / total) * 100),
    '3_neutral': Math.round((counts[3] / total) * 100),
    '2_bad': Math.round((counts[2] / total) * 100),
    '1_very_bad': Math.round((counts[1] / total) * 100),
  };
}

/** Shape the crawled product into what productAnalytics.normalizeProduct expects. */
function buildRawProduct(product, reviews, siteLabel) {
  const samples = toSamples(reviews);
  const current = Number(product.price) || 0;
  const original = Number(product.originalPrice) > current ? Number(product.originalPrice) : null;
  const reviewCount = Number(product.ratingCount) || Number(product.reviewCount) || samples.length;
  const rating = Number(product.rating) || averageRating(samples);

  return {
    id: `url-${String(hashCode(product.url || product.title || '')).slice(0, 10)}`,
    name: product.title || `This product (${siteLabel || 'the store'})`,
    brand: product.brand,
    category: product.category,
    description: product.description,
    image: product.image,
    current_price: current,
    price: original || current,
    sale_price: original,
    on_sale: Boolean(original),
    discount_percent: original ? Math.round(((original - current) / original) * 100) : 0,
    you_save: original ? original - current : 0,
    currency: product.currency || 'INR',
    rating,
    reviews_count: reviewCount,
    reviewSamples: samples,
    rating_breakdown: product.starDistribution || breakdownFromReviews(samples) || null,
    in_stock: product.availability === false
      ? false
      : !/unavailable|out of stock|temporarily|not in stock/i.test(String(product.availability || '')),
    marketplace: siteLabel || null,
    weight: product.weight,
    durabilityScore: null,
    warrantyScore: null,
    waterproof: Boolean(product.waterproof),
  };
}

const CATEGORY_INFERENCE = [
  { cat: 'Electronics', re: /smartphone|phone|mobile|tablet|laptop|notebook|tv\b|television|headphone|earbud|earphone|speaker|watch|camera|monitor|printer|router|console|kindle|ipad|iphone|macbook|charging|power bank|ssd|hard drive|gadget|electronic|charger|usb|bluetooth|wifi/i },
  { cat: 'Fashion', re: /shoe|sneaker|shirt|t-?shirt|jeans|dress|jacket|hoodie|trouser|shorts|kurti|saree|sari|blazer|coat|fashion|watch|handbag|bag\b|wallet|belt|scarf|sock|lingerie|innerwear|footwear/i },
  { cat: 'Beauty & Personal Care', re: /beauty|skincare|skin care|makeup|perfume|fragrance|shampoo|conditioner|cream|serum|face wash|sunscreen|lipstick|mascara|deodorant|body wash|lotion|hair ?care|nail polish|cosmetic/i },
  { cat: 'Home & Kitchen', re: /home|kitchen|furniture|sofa|bed\b|mattress|pillow|curtain|towel|lamp|blender|mixer|grinder|toaster|kettle|cookware|pan\b|utensil|vacuum|cleaner|storage|decor|fridge|refrigerator|washing machine|dishwasher|air conditioner|\bac\b|fan\b|heater|table|chair|shelf|kitchen/i },
  { cat: 'Sports & Outdoors', re: /sports|gym|yoga|fitness|cricket|football|badminton|tennis|cycling|bicycle|treadmill|dumbbell|mat\b|camping|hiking|tent|running|shoes|racket|weights?|exercise/i },
  { cat: 'Toys & Games', re: /toy|toys|puzzle|lego|board game|doll|action figure|playstation|xbox|game\b|gaming|remote control|barbie|building blocks/i },
  { cat: 'Books & Stationery', re: /book\b|books|novel|notebook|pen\b|pencil|stationery|diary|journal|sketch|textbook|comic|paper|ruler|paint/i },
  { cat: 'Groceries & Food', re: /grocery|food|snack|chips|biscuit|cookie|rice|oil\b|ghee|milk|tea\b|coffee|juice|chocolate|candy|spice|masala|atta|flour|sugar|salt|noodles|pasta|sauce|jam|honey/i },
  { cat: 'Pet Supplies', re: /pet|dog|cat\b|aquarium|bird|hamster|pet food|dog food|cat food|litter|treat|leash|collar/i },
  { cat: 'Automotive', re: /car\b|auto|bike\b|scooter|tyre|tire|engine|helmet|seat cover|dashboard|car accessory|oil filter|air filter|battery|motorcycle/i },
];

/** Infer a broad catalog category from product copy when the store category is missing or unmatched. */
function inferCategory(text) {
  const t = String(text || '').toLowerCase();
  if (!t) return null;
  for (const { cat, re } of CATEGORY_INFERENCE) {
    if (re.test(t)) return cat;
  }
  return null;
}

function catalogContext(raw) {
  const catalog = getAll();
  const rawCat = String(raw.category || '').toLowerCase().trim();
  if (!rawCat) return { products: [], matches: false, inferred: null };

  const exact = catalog.filter(
    (p) => String(p.category || '').toLowerCase().trim() === rawCat
  );
  if (exact.length) return { products: exact, matchesRawCategory: true, inferred: null };

  const broad = catalog.filter((p) => {
    const cat = String(p.category || '').toLowerCase();
    return cat.includes(rawCat) || rawCat.includes(cat);
  });
  return { products: broad.slice(0, 200), matchesRawCategory: false, inferred: null };
}

function slugTokens(path) {
  return (path || '')
    .split('/')
    .flatMap((seg) => String(seg).split(/[-_.]/))
    .map((t) => String(t).toLowerCase().trim())
    .filter((t) => /^[a-z][a-z0-9]{2,}$/.test(t))
    .filter((t) => !/^(itm|pdp|dp|gp|product|buy|pid|sku|pr|www|com|in|html|index|shop|store)\d*$/.test(t));
}

function safePathname(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return String(url || '').split(/[?#]/)[0];
  }
}

/**
 * Some storefronts (Myntra, Flipkart, Nykaa) redirect headless crawlers to
 * unrelated fallback pages. Flag when the path's meaningful tokens share no
 * words with the extracted title, so the UI can warn instead of silently
 * analyzing the wrong product.
 */
function contentMismatch(urlPath, title) {
  const pathTokens = slugTokens(urlPath);
  if (pathTokens.length < 2) return null;
  const titleWords = new Set(
    String(title || '').toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2)
  );
  const overlap = pathTokens.filter((t) => titleWords.has(t)).length;
  if (overlap > 0) return null;
  return {
    expected: pathTokens.slice(0, 4),
    note: `The page served looks like it may be a different product than the one in the URL (found "${String(title || '').slice(0, 60)}"). Storefronts sometimes redirect bots to unrelated pages — verify the product before relying on this analysis.`,
  };
}

/**
 * Full URL → intelligence report pipeline.
 * @param {object} opts
 * @param {string}   opts.url      pasted product URL
 * @param {string}   [opts.prompt] optional user wording
 * @param {object}   [opts.user]   user profile for report personalization
 * @param {object}   [opts.intent] parsed intent for suitability scoring
 */
async function analyzeUrl({ url, prompt = null, user = null, intent = {} }) {
  const progress = [];
  const onProgress = (msg) => progress.push(msg);

  const extract = await extractProductFromUrl(url, onProgress);
  if (!extract.ok) {
    return {
      ok: false,
      error: extract.error || 'Could not analyze this URL.',
      kind: extract.kind,
      status: extract.status || null,
      requestedUrl: url,
      resolvedUrl: extract.url || url,
      site: extract.site || null,
      progress,
    };
  }

  const product = extract.product;
  const reviews = extract.reviews;
  const extraction = extract.extraction || {};

  // Storefronts that gate their pages behind anti-bot walls when hit from our
  // servers: fail with a clear explanation instead of analyzing the wrong page.
  const STORE_BLOCK_NOTES = {
    flipkart: "Flipkart serves product pages as a JavaScript app and blocks automated requests from our servers, so nothing could be read. Flipkart links work best in a normal browser \u2014 or paste an Amazon.in link here and we'll analyze the same product.",
    meesho: 'Meesho returned an Access Denied (403) \u2014 it blocks automated access from our servers, so this product can\u2019t be read live. Try an Amazon.in link or the sample report instead.',
    myntra: 'Myntra redirected our automated request to an unrelated page, so the product you pasted couldn\u2019t be analyzed. Try the exact product link, an Amazon.in link, or the sample report.',
    nykaa: 'Nykaa blocks automated requests from our servers, so this product couldn\u2019t be read live. Try an Amazon.in link or the sample report instead.',
    ajio: 'Ajio blocks automated requests from our servers, so this product couldn\u2019t be read live. Try an Amazon.in link or the sample report instead.',
  };
  if (extract.ok && STORE_BLOCK_NOTES[extraction.site && extraction.site.id]) {
    const hasData = Boolean(product.title) || Number(product.price) > 0 || reviews.length > 0;
    const blockedFlag =
      extraction.blocked || extraction.fetchedStatus === 403 || extraction.fetchedStatus === 429;
    const mismatch = contentMismatch(extraction.sourceUrl || url, product.title || '');
    if (mismatch || blockedFlag || !hasData) {
      return {
        ok: false,
        kind: 'store_blocked',
        error: STORE_BLOCK_NOTES[extraction.site.id],
        requestedUrl: url,
        resolvedUrl: extraction.sourceUrl || url,
        site: extraction.site,
        status: extraction.fetchedStatus || null,
        progress,
      };
    }
  }

  // A page that yields neither a name nor a price nor reviews has nothing to
  // reason about — fail fast with a friendly message instead of analyzing air.
  const hasAnyData = Boolean(product.title) || (Number(product.price) > 0) || reviews.length > 0;
  if (!hasAnyData) {
    return {
      ok: false,
      kind: 'sparse_page',
      error: 'This page did not expose any product data \u2014 it may be sold out, geo-blocked, a dead link, or a page without structured product info. Try pasting the link to a live product page.',
      requestedUrl: url,
      resolvedUrl: extraction.sourceUrl || url,
      site: extraction.site,
      progress,
    };
  }

  const raw = buildRawProduct(product, reviews, extraction.site && extraction.site.label);

  const mismatch = contentMismatch(safePathname(extraction.sourceUrl || url), product.title || raw.name || '');

  // Infer a broad catalog category from the product name when possible, so
  // category benchmarking + alternatives + the category profile apply to
  // URL-crawled products (store categories rarely match the catalog taxonomy).
  const inferred = inferCategory(raw.title || raw.name || '');
  if (inferred && inferred !== raw.category) raw.category = inferred;

  const ctx = catalogContext(raw);
  const categoryProducts = ctx.products;

  const alternatives = categoryProducts
    .filter((p) => String(p.id) !== String(raw.id))
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 4);

  const analytics = analyzeProduct({
    product: raw,
    categoryProducts,
    alternatives,
    user,
    intent,
  });

  const reportContext = {
    prompt: prompt || `Product pasted from ${extraction.site.label}.`,
    user,
    alternatives,
  };
  const report = await generateReport(analytics, reportContext);

  /* ---------- Deterministic intelligence enrichment ---------- */
  const marketPrices = (categoryProducts || [])
    .map((p) => Number(p.current_price) || Number(p.price))
    .filter((v) => Number.isFinite(v) && v > 0)
    .slice(0, 60);

  const priceGen = priceIntelligence(product, { history: [], marketPrices });

  const reviewAnalysis = reviewAnalyzer.analyze(reviews, {
    max: config.crawler.maxReviews,
    starOverride: raw.rating_breakdown || undefined,
  });
  const reviewSentiment = deriveSentiment({
    ...reviewAnalysis,
    present: reviewAnalysis.present,
    total: reviewAnalysis.total,
    positive: reviewAnalysis.positive,
    neutral: reviewAnalysis.neutral,
    negative: reviewAnalysis.negative,
    avgRating: reviewAnalysis.avgRating,
  });

  const personas = personaEngine.build(product, {
    specRows: [],
    specsObj: product.specifications || {},
    analyzed: reviewAnalysis,
  });

  const specExplained = explainSpecs(product.specifications || {}, product.specRows || []);

  const enriched = {
    price: {
      current: priceGen.current,
      original: priceGen.original,
      discountPercent: priceGen.discountPercent,
      fairnessScore: priceGen.fairnessScore,
      fairnessLabel: priceGen.fairnessLabel,
      volatility: priceGen.volatility,
      bestTimeToBuy: priceGen.bestTimeToBuy,
      seasonality: priceGen.seasonality,
      priceTrend: priceGen.priceTrend,
      savingsOpportunity: priceGen.savingsOpportunity,
      fairRange: priceGen.fairRange,
      market: priceGen.market,
      confidence: priceGen.confidence,
      notes: priceGen.notes,
      source: 'computed',
    },
    sentiment: reviewSentiment,
    personas,
    specExplained,
    reviewAnalysis: {
      positive: reviewAnalysis.positive,
      neutral: reviewAnalysis.neutral,
      negative: reviewAnalysis.negative,
      fakeRisk: reviewAnalysis.fakeRisk,
      spamRemoved: reviewAnalysis.spamRemoved,
      duplicatesRemoved: reviewAnalysis.duplicatesRemoved,
      avgRating: reviewAnalysis.avgRating,
      starDistribution: reviewAnalysis.starDistribution,
      praiseCount: (reviewAnalysis.praises || []).length,
      complaintsCount: (reviewAnalysis.complaints || []).length,
      recurringIssues: reviewAnalysis.recurringIssues || [],
      positiveQuotes: (reviewAnalysis.positiveQuotes || []).slice(0, 3),
      negativeQuotes: (reviewAnalysis.negativeQuotes || []).slice(0, 3),
    },
  };

  return {
    ok: true,
    requestedUrl: url,
    resolvedUrl: extraction.sourceUrl || url,
    short: extraction.short || false,
    shortenedHost: extraction.shortenedHost || null,
    site: extraction.site,
    product: {
      ...product,
      category: raw.category || product.category || null,
      rating: raw.rating != null ? raw.rating : product.rating,
      reviews_count: raw.reviews_count != null ? raw.reviews_count : product.reviews_count,
      rating_breakdown: raw.rating_breakdown || product.starDistribution || null,
      in_stock: raw.in_stock,
    },
    reviews: reviews.slice(0, config.crawler.maxReviews),
    analytics,
    report: {
      ...report,
      intelligence: enriched,
    },
    dataQuality: report.dataQuality,
    contentMismatch: mismatch || null,
    extraction: {
      ...extraction,
      progress,
    },
    progress,
  };
}

module.exports = { analyzeUrl, buildRawProduct };