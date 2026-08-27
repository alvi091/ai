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
const prisma = require('../database');
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

async function catalogContext(raw) {
  const rawCat = String(raw.category || '').toLowerCase().trim();
  if (!rawCat) return { products: [], matches: false, inferred: null };

  let rows = [];
  try {
    rows = await prisma.product.findMany({
      where: { category: { equals: rawCat, mode: 'insensitive' } },
      take: 100,
      select: {
        id: true, name: true, brand: true, price: true, rating: true, reviews: true,
        image: true, category: true, currency: true,
      },
    });
  } catch {
    rows = [];
  }
  if (rows.length) return { products: rows, matchesRawCategory: true, inferred: null };

  // Broad includes fallback — use contains instead of loading 500 rows.
  try {
    rows = await prisma.product.findMany({
      where: {
        OR: [
          { category: { contains: rawCat, mode: 'insensitive' } },
          { name: { contains: rawCat, mode: 'insensitive' } },
        ],
      },
      take: 100,
      select: { id: true, name: true, brand: true, price: true, rating: true, reviews: true, image: true, category: true, currency: true },
    });
  } catch { /* ignore */ }
  return { products: rows, matchesRawCategory: false, inferred: null };
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
  const t0 = Date.now();
  const progress = [];
  const onProgress = (msg) => progress.push(msg);
  const timing = {};

  const extract = await extractProductFromUrl(url, onProgress);
  timing.crawlMs = Date.now() - t0;
  if (extract.timing) {
    timing.validateMs = extract.timing.validateMs;
    timing.fetchMs = extract.timing.fetchMs;
    timing.extractMs = extract.timing.extractionMs;
    timing.reviewsMs = extract.timing.reviewsMs;
    timing.extractionTotalMs = extract.timing.totalMs;
  }

  if (!extract.ok) {
    console.log(`[timing] FAIL site=${extract.site && extract.site.id} crawl=${timing.crawlMs}ms kind=${extract.kind}`);
    return {
      ok: false,
      error: extract.error || 'Could not analyze this URL.',
      kind: extract.kind,
      status: extract.status || null,
      requestedUrl: url,
      resolvedUrl: extract.url || url,
      site: extract.site || null,
      progress,
      timing,
    };
  }

  const product = extract.product;
  const reviews = extract.reviews;
  const extraction = extract.extraction || {};

  // Storefronts that gate their pages behind anti-bot walls even after JS
  // rendering: fail with a clear explanation instead of analyzing the wrong page.
  const STORE_BLOCK_NOTES = {
    flipkart: "Flipkart still serves anti-bot walls to our servers, so nothing could be read this time. Flipkart links work best in a normal browser \u2014 or paste an Amazon.in link here and we'll analyze the same product.",
    meesho: 'Meesho returned Access Denied and blocked the live render from our servers, so this product couldn\u2019t be read. Try an Amazon.in link or the sample report instead.',
    myntra: 'Myntra redirected our automated request to an unrelated page, so the product you pasted couldn\u2019t be analyzed. Try the exact product link, an Amazon.in link, or the sample report.',
    nykaa: 'Nykaa blocked the automated request from our servers, so this product couldn\u2019t be read live. Try an Amazon.in link or the sample report instead.',
    ajio: 'Ajio blocked the automated request from our servers, so this product couldn\u2019t be read live. Try an Amazon.in link or the sample report instead.',
    noon: 'Noon blocked the automated render from our servers, so this product couldn\u2019t be read. Try the exact product link or an Amazon link instead.',
    namshi: 'Namshi blocked the automated render from our servers, so this product couldn\u2019t be read. Try an Amazon link or the sample report instead.',
    carrefour: 'Carrefour blocked the automated render from our servers, so this product couldn\u2019t be read. Try an Amazon link or the sample report instead.',
    sharafDG: 'Sharaf DG blocked the automated render from our servers, so this product couldn\u2019t be read. Try an Amazon link or the sample report instead.',
    dubaiStore: 'DubaiStore blocked the automated render from our servers, so this product couldn\u2019t be read. Try an Amazon link or the sample report instead.',
  };
  if (extract.ok && STORE_BLOCK_NOTES[extraction.site && extraction.site.id]) {
    const hasData = Boolean(product.title) || Number(product.price) > 0 || reviews.length > 0;
    const blockedFlag =
      extraction.blocked || extraction.fetchedStatus === 403 || extraction.fetchedStatus === 429;
    const mismatch = contentMismatch(extraction.sourceUrl || url, product.title || '');
    if (mismatch || blockedFlag || !hasData) {
      console.log(`[timing] BLOCKED site=${extraction.site.id} crawl=${timing.crawlMs}ms mismatch=${mismatch} blockedFlag=${blockedFlag} hasData=${hasData} title=${(product.title || '').slice(0, 60)} price=${product.price} reviews=${reviews.length}`);
      return {
        ok: false,
        kind: 'store_blocked',
        error: STORE_BLOCK_NOTES[extraction.site.id],
        requestedUrl: url,
        resolvedUrl: extraction.sourceUrl || url,
        site: extraction.site,
        status: extraction.fetchedStatus || null,
        progress,
        timing,
      };
    }
  }

  // A page that yields neither a name nor a price nor reviews has nothing to
  // reason about — fail fast with a friendly message instead of analyzing air.
  const hasAnyData = Boolean(product.title) || (Number(product.price) > 0) || reviews.length > 0;
  if (!hasAnyData) {
    console.log(`[timing] SPARSE site=${extraction.site && extraction.site.id} crawl=${timing.crawlMs}ms`);
    return {
      ok: false,
      kind: 'sparse_page',
      error: 'This page did not expose any product data \u2014 it may be sold out, geo-blocked, a dead link, or a page without structured product info. Try pasting the link to a live product page.',
      requestedUrl: url,
      resolvedUrl: extraction.sourceUrl || url,
      site: extraction.site,
      progress,
      timing,
    };
  }

  const raw = buildRawProduct(product, reviews, extraction.site && extraction.site.label);

  const mismatch = contentMismatch(safePathname(extraction.sourceUrl || url), product.title || raw.name || '');

  // Infer a broad catalog category from the product name when possible, so
  // category benchmarking + alternatives + the category profile apply to
  // URL-crawled products (store categories rarely match the catalog taxonomy).
  const inferred = inferCategory(raw.title || raw.name || '');
  if (inferred && inferred !== raw.category) raw.category = inferred;

  const tCat = Date.now();
  const ctx = await catalogContext(raw);
  timing.catalogMs = Date.now() - tCat;
  const categoryProducts = ctx.products;

  const alternatives = categoryProducts
    .filter((p) => String(p.id) !== String(raw.id))
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 4);

  const tAnalytics = Date.now();
  const analytics = analyzeProduct({
    product: raw,
    categoryProducts,
    alternatives,
    user,
    intent,
  });
  timing.analyticsMs = Date.now() - tAnalytics;

  const reportContext = {
    prompt: prompt || `Product pasted from ${extraction.site.label}.`,
    user,
    alternatives,
  };
  const tGemini = Date.now();
  const report = await generateReport(analytics, reportContext);
  timing.geminiMs = Date.now() - tGemini;

  /* ---------- Deterministic intelligence enrichment ---------- */
  const marketPrices = (categoryProducts || [])
    .map((p) => Number(p.current_price) || Number(p.price))
    .filter((v) => Number.isFinite(v) && v > 0)
    .slice(0, 60);

  const priceGen = priceIntelligence(product, { history: [], marketPrices });

  const reviewAnalysis = reviewAnalyzer.analyze(reviews, {
    max: (config.crawler.flipkartReviews === 0 && extraction.site && extraction.site.id === 'flipkart')
      || (config.crawler.myntraReviews === 0 && extraction.site && extraction.site.id === 'myntra')
      || (config.crawler.amazonReviews === 0 && extraction.site && extraction.site.id === 'amazon')
      || (config.crawler.ajioReviews === 0 && extraction.site && extraction.site.id === 'ajio')
      || (config.crawler.nykaaReviews === 0 && extraction.site && extraction.site.id === 'nykaa')
      || (config.crawler.meeshoReviews === 0 && extraction.site && extraction.site.id === 'meesho')
      ? 400
      : config.crawler.maxReviews,
    starOverride: raw.rating_breakdown || undefined,
    productName: product.title || product.name || '',
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

  // Tag every collected review with its polarity + tagged aspects so the UI can
  // annotate the full feed (single source of truth = the analyzer's word lists).
  const taggedReviews = (reviews || []).map((r) => ({
    ...r,
    polarity: reviewAnalyzer.polarityOf(r),
    aspects: reviewAnalyzer.aspectHits(String(r.text || '')),
  }));

  const aspectSentiment = {};
  for (const [k, m] of Object.entries(reviewAnalysis.aspectSentiment || {})) {
    aspectSentiment[k] = {
      ...m,
      samples: (m.samples || []).slice(0, 2).map((s) => String(s).slice(0, 200)),
    };
  }

  timing.totalMs = Date.now() - t0;
  console.log(`[timing] OK site=${extraction.site && extraction.site.id} reviews=${reviews.length} fetch=${timing.fetchMs || 0}ms extract=${timing.extractMs || 0}ms reviews=${timing.reviewsMs || 0}ms catalog=${timing.catalogMs || 0}ms analytics=${timing.analyticsMs || 0}ms gemini=${timing.geminiMs || 0}ms total=${timing.totalMs}ms`);

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
      present: reviewAnalysis.present,
      total: reviewAnalysis.total,
      fakeRisk: reviewAnalysis.fakeRisk,
      spamRemoved: reviewAnalysis.spamRemoved,
      duplicatesRemoved: reviewAnalysis.duplicatesRemoved,
      avgRating: reviewAnalysis.avgRating,
      starDistribution: reviewAnalysis.starDistribution,
      confidence: reviewAnalysis.confidence,
      praiseCount: (reviewAnalysis.praises || []).length,
      complaintsCount: (reviewAnalysis.complaints || []).length,
      praises: reviewAnalysis.praises || [],
      complaints: reviewAnalysis.complaints || [],
      aspectSentiment,
      recurringIssues: reviewAnalysis.recurringIssues || [],
      positiveQuotes: (reviewAnalysis.positiveQuotes || []).slice(0, 10),
      negativeQuotes: (reviewAnalysis.negativeQuotes || []).slice(0, 10),
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
    reviews: (config.crawler.flipkartReviews === 0 && (extraction.site && extraction.site.id === 'flipkart'))
      || (config.crawler.myntraReviews === 0 && (extraction.site && extraction.site.id === 'myntra'))
      || (config.crawler.amazonReviews === 0 && (extraction.site && extraction.site.id === 'amazon'))
      || (config.crawler.ajioReviews === 0 && (extraction.site && extraction.site.id === 'ajio'))
      || (config.crawler.nykaaReviews === 0 && (extraction.site && extraction.site.id === 'nykaa'))
      || (config.crawler.meeshoReviews === 0 && (extraction.site && extraction.site.id === 'meesho'))
      ? taggedReviews
      : taggedReviews.slice(0, config.crawler.maxReviews),
    alternatives: alternatives.map((a) => ({
      id: a.id,
      name: a.name,
      brand: a.brand || null,
      price: a.price,
      rating: a.rating,
      reviews: a.reviews,
      image: a.image || null,
      currency: a.currency || raw.currency || 'INR',
    })),
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
    timing,
    progress,
  };
}

module.exports = { analyzeUrl, buildRawProduct };