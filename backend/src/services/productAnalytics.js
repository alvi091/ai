const { getCategoryProfile } = require('./categoryProfiles');
const { analyzePriceTrend, analyzeReviewSentiment } = require('./trendAnalysis');
const { extractReviewMetrics } = require('./reviewTopicExtractor');
const { computePopularity, percentileRank } = require('./popularityMetrics');
const { computeWorth } = require('./worthEngine');
const { decide } = require('./decisionVerdict');
const { calculateRegretScore } = require('./buyerRegretEngine');

function hashCode(str) {
  let h = 0;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function normalizeProduct(raw, currencyOverride = null) {
  if (!raw) return null;
  const isPrisma = raw.current_price === undefined;
  const price = isPrisma ? Number(raw.price) : Number(raw.current_price);
  let originalPrice = isPrisma
    ? (raw.originalPrice != null ? Number(raw.originalPrice) : null)
    : (raw.on_sale && raw.sale_price > 0 ? Number(raw.price) : null);

  if (originalPrice == null || originalPrice <= price) originalPrice = null;

  let reviewSamples = [];
  if (typeof raw.reviewSamples === 'string') {
    try { reviewSamples = JSON.parse(raw.reviewSamples); } catch { reviewSamples = []; }
  } else if (Array.isArray(raw.reviewSamples)) {
    reviewSamples = raw.reviewSamples;
  } else if (Array.isArray(raw.reviews)) {
    reviewSamples = raw.reviews;
  }

  const toNull = (v) => (v == null || Number(v) === 0 ? null : Number(v));

  return {
    id: raw.id,
    name: raw.name,
    brand: raw.brand,
    category: raw.category,
    description: raw.description,
    image: raw.image || (raw.images && raw.images.main) || null,
    price,
    originalPrice,
    currency: currencyOverride || raw.currency || 'INR',
    rating: Number(raw.rating) || 0,
    reviews: isPrisma ? Number(raw.reviews) || 0 : Number(raw.reviews_count) || 0,
    reviewsCount: Number(raw.reviews_count) || Number(raw.reviews) || 0,
    reviewSamples,
    ratingBreakdown: typeof raw.rating_breakdown === 'string'
      ? JSON.parse(raw.rating_breakdown)
      : raw.rating_breakdown || null,
    priceHistory: Array.isArray(raw.price_history) ? raw.price_history : [],
    catalogCurrentPrice: toNull(raw.catalogCurrentPrice),
    onSale: isPrisma ? (raw.originalPrice != null && raw.originalPrice > raw.price) : Boolean(raw.on_sale),
    discountPercent: isPrisma
      ? (raw.originalPrice ? Math.round((1 - raw.price / raw.originalPrice) * 100) : 0)
      : Number(raw.discount_percent) || 0,
    inStock: isPrisma ? raw.inStock !== false : raw.in_stock !== false,
    stockQuantity: toNull(raw.stock_quantity) || toNull(raw.stockLevel),
    durabilityScore: toNull(raw.durabilityScore),
    warrantyScore: toNull(raw.warrantyScore),
    weight: toNull(raw.weight),
    batteryScore: toNull(raw.batteryScore),
    comfortScore: toNull(raw.comfortScore),
    waterproof: Boolean(raw.waterproof),
    marketplace: raw.marketplace || null,
    returnRate: toNull(raw.returnRate),
  };
}

function median(values) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function computeCategoryStats(products = []) {
  const prices = products.map((p) => p.price).filter((v) => v > 0);
  const ratings = products.map((p) => p.rating).filter((v) => v > 0);
  const reviewCounts = products.map((p) => p.reviews).filter((v) => v > 0);

  return {
    count: products.length,
    medianPrice: median(prices),
    medianRating: median(ratings),
    medianReviews: median(reviewCounts),
    maxReviews: Math.max(...reviewCounts, 1),
    prices,
    ratings,
    reviewCounts,
    pricePercentile: null,
    ratingPercentile: null,
  };
}

function pricePercentileFor(price, prices) {
  if (!prices.length) return 50;
  return percentileRank(price, prices);
}

function findBetterAlternative(product, alternatives = []) {
  const alts = (alternatives || [])
    .map((a) => ({ ...a, rating: Number(a.rating) || 0, price: Number(a.price) || 0 }))
    .filter((a) => a.id !== product.id && a.price > 0);
  for (const alt of alts) {
    if (alt.rating >= product.rating + 0.3 && alt.price <= product.price * 1.05) {
      return { name: alt.name, price: alt.price, rating: alt.rating };
    }
  }
  return null;
}

function analyzeProduct({ product: rawProduct, priceHistory = [], categoryProducts = [], alternatives = [], user = null, intent = {}, currency = null }) {
  const product = normalizeProduct(rawProduct, currency);
  if (!product) return null;

  const profile = getCategoryProfile(product.category);
  let history = priceHistory && priceHistory.length ? priceHistory : [];
  let historySource = 'db';

  if (!history.length && Array.isArray(product.priceHistory) && product.priceHistory.length) {
    const rawCurrent = product.catalogCurrentPrice;
    if (rawCurrent > 0) {
      const ratio = product.price / rawCurrent;
      history = product.priceHistory.map((h) => ({
        date: h.date,
        price: Math.round((Number(h.price) || 0) * ratio * 100) / 100,
      }));
      historySource = 'catalog-scaled';
    } else {
      history = product.priceHistory;
      historySource = 'catalog';
    }
  }

  const trend = analyzePriceTrend(history, product.price);
  const reviews = extractReviewMetrics({
    ...product,
    reviews_count: product.reviewsCount,
    rating_breakdown: product.ratingBreakdown,
  });
  const sentiment = analyzeReviewSentiment(product.reviewSamples, product.rating);

  const categoryStats = computeCategoryStats(categoryProducts);
  const pricePercentile = pricePercentileFor(product.price, categoryStats.prices);
  const popularity = computePopularity(product, categoryStats);

  const risk = calculateRegretScore(product, history);

  const fairnessSignals = {
    currentPrice: product.price,
    lowPrice: trend.low || product.price,
    avgPrice: trend.avg || product.price,
    highPrice: trend.high || product.price,
    originalPrice: product.originalPrice || trend.high || product.price,
    discountPercent: product.discountPercent,
    trend: trend.direction,
  };

  const worth = computeWorth({
    rating: product.rating,
    reviewConfidence: reviews.reviewConfidence,
    priceFairness: fairnessSignals,
    trend,
    risk,
    popularity,
    categoryProfile: profile,
    durabilityScore: product.durabilityScore,
    warrantyScore: product.warrantyScore,
  });

  let suitability = null;
  if (intent && Object.keys(intent).length > 0) {
    try {
      const { calculateSuitability } = require('./suitabilityEngine');
      suitability = calculateSuitability({ ...product, price: product.price, reviews: product.reviews }, intent, user);
    } catch { suitability = null; }
  }

  const betterAlternative = findBetterAlternative(product, alternatives);

  const decisionSeed = hashCode(product.id + ':' + product.name);

  const decision = decide({
    rating: product.rating,
    negativePercent: reviews.negativePercent,
    positivePercent: reviews.positivePercent,
    reviewConfidence: reviews.reviewConfidence,
    worth: worth.score,
    price: product.price,
    originalPrice: product.originalPrice,
    discountPercent: product.discountPercent,
    nearLow: trend.nearLow,
    nearHigh: trend.nearHigh,
    positionPercent: trend.positionPercent,
    trend: trend.direction,
    low: trend.low,
    high: trend.high,
    avg: trend.avg,
    popularity,
    risk,
    suitability,
    durability: product.durabilityScore,
    warranty: product.warrantyScore,
    pricePercentile,
    betterAlternative,
    onSale: product.onSale,
    category: product.category,
    hasPriceData: trend.present,
    hasReviewData: reviews.present,
    pricePoints: trend.windowDays || 0,
    currency: product.currency,
  }, decisionSeed);

  const dataQuality = {
    price: trend.present ? (trend.windowDays >= 10 ? 'rich' : 'limited') : 'missing',
    reviews: reviews.present ? (reviews.totalReviews >= 30 ? 'rich' : 'limited') : 'missing',
    category: categoryStats.count >= 5 ? 'rich' : 'limited',
    risk: product.returnRate != null || product.durabilityScore != null ? 'present' : 'limited',
    personalization: Boolean(user && (intent && Object.keys(intent).length)),
    priceSource: historySource,
  };

  return {
    product: {
      id: product.id, name: product.name, brand: product.brand, category: product.category,
      price: product.price, originalPrice: product.originalPrice, currency: product.currency,
      rating: product.rating, reviews: product.reviews, onSale: product.onSale,
      discountPercent: product.discountPercent, inStock: product.inStock,
      marketplace: product.marketplace, description: product.description,
    },
    price: {
      current: product.price,
      original: product.originalPrice,
      discountPercent: product.discountPercent,
      onSale: product.onSale,
      low: trend.low,
      high: trend.high,
      avg: trend.avg,
      positionPercent: trend.positionPercent,
      priceHistory: history.map((h) => ({ date: h.date, price: h.price })),
    },
    trend,
    reviews,
    sentiment,
    popularity,
    risk,
    worth,
    category: {
      name: product.category,
      profileKey: profile.key,
      profileLabel: profile.label,
      focusAreas: profile.focusAreas,
      whatMatters: profile.whatMatters,
      timing: profile.timing,
      valueRetention: profile.valueRetention,
      stats: {
        count: categoryStats.count,
        medianPrice: categoryStats.medianPrice,
        medianRating: categoryStats.medianRating,
        medianReviews: categoryStats.medianReviews,
        pricePercentile,
        ratingPercentile: popularity.ratingPercentile,
      },
    },
    suitability,
    betterAlternative,
    decision,
    dataQuality,
  };
}

module.exports = { analyzeProduct, normalizeProduct, computeCategoryStats, median };
