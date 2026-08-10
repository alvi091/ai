const TOPIC_LEXICON = {
  battery: ['battery', 'charge', 'drains', 'battery life', 'charger', 'lasts'],
  comfort: ['comfort', 'comfortable', 'uncomfortable', 'padding', 'cushion', 'ergonomic', 'pressure', 'footbed'],
  durability: ['durable', 'durability', 'sturdy', 'cheaply', 'broke', 'broke after', 'fell apart', 'quality', 'well made', 'lasted', 'solid'],
  performance: ['fast', 'slow', 'speed', 'performance', 'powerful', 'lag', 'quick', 'smooth', 'power'],
  build: ['build', 'materials', 'plastic', 'metal', 'premium', 'flimsy', 'solid build'],
  noise: ['noisy', 'quiet', 'loud', 'hum', 'sound', 'silent'],
  size: ['size', 'small', 'large', 'tiny', 'huge', 'compact', 'roomy', 'runs small', 'runs big', 'fit'],
  value: ['value', 'worth', 'overpriced', 'expensive', 'cheap', 'price', 'deal', 'worth it'],
  software: ['software', 'app', 'updates', 'firmware', 'bugs', 'glitch', 'connectivity', 'bluetooth', 'wifi'],
  design: ['design', 'look', 'style', 'aesthetic', 'color', 'finish', 'sleek', 'beautiful', 'ugly'],
  easeOfUse: ['easy', 'setup', 'install', 'intuitive', 'complicated', 'hard to', 'instructions', 'user-friendly'],
  heating: ['heat', 'hot', 'overheat', 'heats up', 'thermal'],
  camera: ['camera', 'photo', 'picture', 'video', 'image quality', 'sharp'],
  screen: ['screen', 'display', 'bright', 'resolution', 'viewing', 'panel'],
  waterproof: ['waterproof', 'water', 'rain', 'leak', 'wet', 'moisture'],
  shipping: ['shipping', 'delivery', 'arrived', 'packaging', 'box', 'delayed', 'damaged'],
  smell: ['smell', 'scent', 'odor', 'fragrance', 'stinky'],
  food: ['taste', 'fresh', 'stale', 'flavor', 'expiry', 'portion', 'texture'],
  fabric: ['fabric', 'material', 'cotton', 'polyester', 'shrink', 'washed', 'wrinkle', 'soft'],
  repairability: ['repair', 'repairable', 'spare parts', 'ifixit', 'service center'],
  support: ['support', 'customer service', 'warranty', 'refund', 'return', 'replacement'],
};

const TOPIC_LABELS = {
  battery: 'Battery life',
  comfort: 'Comfort',
  durability: 'Durability',
  performance: 'Performance',
  build: 'Build quality',
  noise: 'Noise',
  size: 'Size & fit',
  value: 'Value for money',
  software: 'Software & connectivity',
  design: 'Design',
  easeOfUse: 'Ease of use',
  heating: 'Heating',
  camera: 'Camera',
  screen: 'Display',
  waterproof: 'Waterproofing',
  shipping: 'Shipping & packaging',
  smell: 'Smell',
  food: 'Taste & freshness',
  fabric: 'Fabric',
  repairability: 'Repairability',
  support: 'Support & warranty',
};

function detectTopics(reviews = []) {
  const loved = {};
  const complained = {};

  const add = (map, key, weight) => {
    map[key] = (map[key] || 0) + weight;
  };

  for (const review of reviews) {
    const text = String(review.comment || review.text || '').toLowerCase();
    if (!text) continue;
    const rating = Number(review.rating) || 3;
    const weight = Math.min(3, 1 + Math.log10((review.helpful_votes || 0) + 1));
    const dir = rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : null;
    for (const [key, words] of Object.entries(TOPIC_LEXICON)) {
      const hit = words.some((w) => text.includes(w));
      if (!hit) continue;
      if (dir === 'positive') add(loved, key, weight);
      else if (dir === 'negative') add(complained, key, weight);
    }
  }

  const toList = (map) =>
    Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, weight]) => ({ topic: TOPIC_LABELS[key] || key, key, weight: Math.round(weight * 10) / 10 }));

  return { loved: toList(loved), complained: toList(complained) };
}

function distributionFromReviews(reviews = [], totalCount = 0) {
  const list = (reviews || []).filter((r) => typeof r.rating === 'number');
  if (list.length === 0) return null;
  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  list.forEach((r) => {
    const k = Math.round(r.rating);
    if (counts[k] !== undefined) counts[k] += 1;
  });
  // Percentages come from the observed sample, not the (often much larger)
  // headline review count — otherwise a handful of samples gets diluted to ~0%.
  const total = list.length || 1;
  return {
    p5: Math.round((counts[5] / total) * 100),
    p4: Math.round((counts[4] / total) * 100),
    p3: Math.round((counts[3] / total) * 100),
    p2: Math.round((counts[2] / total) * 100),
    p1: Math.round((counts[1] / total) * 100),
  };
}

function roundPct(v) {
  return Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
}

/**
 * Breakdown values are either already percentages (sum ~100) or raw counts.
 * Detect which and normalize to percentages.
 */
function normalizeBreakdown(breakdown = {}, totalCount = 0) {
  const b = breakdown || {};
  const raw = [b['5_best'], b['4_good'], b['3_neutral'], b['2_bad'], b['1_very_bad']].map((v) => Number(v) || 0);
  const sum = raw.reduce((s, v) => s + v, 0);
  let pct = raw;
  if (sum > 0 && sum <= 100) {
    pct = raw; // already percentages
  } else if (totalCount > 0) {
    pct = raw.map((v) => (v / totalCount) * 100);
  } else if (sum > 0) {
    pct = raw.map((v) => (v / sum) * 100);
  }
  return {
    p5: roundPct(pct[0]),
    p4: roundPct(pct[1]),
    p3: roundPct(pct[2]),
    p2: roundPct(pct[3]),
    p1: roundPct(pct[4]),
  };
}

function extractReviewMetrics(product = {}) {
  let reviews = [];
  try {
    reviews = typeof product.reviewSamples === 'string'
      ? JSON.parse(product.reviewSamples)
      : Array.isArray(product.reviewSamples) ? product.reviewSamples : product.reviews || [];
  } catch {
    reviews = product.reviews || [];
  }
  reviews = reviews.filter((r) => r && typeof r === 'object');

  const count = Number(product.reviews) || Number(product.reviews_count) || reviews.length || 0;
  const rating = Number(product.rating) || 0;
  const breakdownRaw = typeof product.rating_breakdown === 'string'
    ? JSON.parse(product.rating_breakdown)
    : product.rating_breakdown;

  let distribution = normalizeBreakdown(breakdownRaw, count);
  if (!breakdownRaw || Object.values(distribution).every((v) => v === 0)) {
    const fromReviews = distributionFromReviews(reviews, count);
    if (fromReviews) distribution = fromReviews;
  }

  const positive = distribution.p5 + distribution.p4;
  const negative = distribution.p2 + distribution.p1;
  const neutral = distribution.p3;

  const topics = detectTopics(reviews);

  const sorted = [...reviews].sort((a, b) => (b.helpful_votes || 0) - (a.helpful_votes || 0));
  const positiveQuotes = sorted.filter((r) => Number(r.rating) >= 4).slice(0, 3);
  const negativeQuotes = sorted.filter((r) => Number(r.rating) <= 2).slice(0, 3);

  const confidence = count >= 200 ? 95 : count >= 100 ? 88 : count >= 50 ? 78 : count >= 20 ? 62 : count >= 5 ? 45 : 25;

  return {
    present: reviews.length > 0 || count > 0,
    totalReviews: count,
    sampleSize: reviews.length,
    averageRating: rating,
    distribution,
    positivePercent: positive,
    neutralPercent: neutral,
    negativePercent: negative,
    mostLoved: topics.loved,
    mostComplained: topics.complained,
    positiveQuotes,
    negativeQuotes,
    reviewConfidence: confidence,
    sparse: count < 20,
  };
}

module.exports = { extractReviewMetrics, detectTopics, normalizeBreakdown, TOPIC_LABELS };
