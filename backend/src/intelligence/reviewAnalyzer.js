/*
 * Review analyzer — cleaning + intelligence over buyer reviews (Step 4).
 *
 *  - Removes spam, duplicates, ultra-short junk.
 *  - Heuristic fake-review scoring.
 *  - Deterministic sentiment classification (positive / neutral / negative).
 *  - Aspect tagging and clustering into praised/complained topics.
 *
 * Everything comes from the reviews actually seen — no invented opinions.
 */

const ASPECT_LABELS = {
  battery: 'Battery life', camera: 'Camera', display: 'Display & screen', comfort: 'Comfort & fit',
  durability: 'Durability', performance: 'Performance', value: 'Value for money',
  build: 'Build quality', sound: 'Sound & audio', software: 'Software & connectivity',
  heating: 'Thermals', size: 'Size & weight', shipping: 'Delivery & packaging',
  support: 'Support & warranty', waterproof: 'Water resistance',
  fragrance: 'Fragrance', texture: 'Texture & feel', results: 'Effectiveness',
  ingredients: 'Ingredients', packaging: 'Packaging', skin: 'Skin & hair feel',
  scalp: 'Scalp care', dandruff: 'Dandruff control', hairfall: 'Hair fall control',
  grip: 'Grip & sole', strap: 'Strap & fit', foot: 'Foot comfort',
  support_mattress: 'Back & joint support', edge: 'Edge support',
  breathability: 'Breathability', motion: 'Motion isolation',
  stain: 'Stain resistance', fabric: 'Fabric & material', wash: 'Wash care',
  fit: 'Fit & sizing', color: 'Color & finish', style: 'Style & look',
};

// Category-specific aspect keywords. Each category only matches relevant aspects.
const CATEGORY_ASPECTS = {
  footwear: {
    re: /shoe|sneaker|sandal|slipper|flip.?flop|chappal|floaters|loafer|boot|crocs/i,
    aspects: {
      grip: ['grip', 'slip', 'traction', 'anti slip', 'non slip', 'sole grip'],
      strap: ['strap', 'belt', 'velcro', 'buckle', 'lace', 'tight', 'loose'],
      foot: ['foot', 'arch', 'heel', 'toe', 'sole', 'insole', 'cushion', 'pain', 'blister'],
      comfort: ['comfortable', 'comfort', 'soft', 'cushion', 'walking', 'standing'],
      durability: ['durable', 'durability', 'sturdy', 'break', 'crack', 'peel', 'tear', 'wear'],
      style: ['style', 'look', 'design', 'color', 'appearance', 'trendy', 'fashion'],
      value: ['value', 'worth', 'price', 'expensive', 'deal', 'cost', 'budget'],
      shipping: ['delivery', 'packaging', 'box', 'courier', 'arrived', 'late'],
      build: ['quality', 'material', 'plastic', 'rubber', 'leather', 'fabric', 'finish'],
    },
  },
  mattress: {
    re: /mattress|bed|sleep|foam|cushion|sofa|pillow|topper|base.*bed/i,
    aspects: {
      comfort_mattress: ['comfortable', 'comfort', 'soft', 'firm', 'sleep', 'night', 'resting'],
      support_mattress: ['support', 'back', 'joint', 'orthopedic', 'spine', 'waist', 'pain relief'],
      edge: ['edge', 'sitting edge', 'edge support', 'falling', 'roll off'],
      breathability: ['breathable', 'breathability', 'air', 'ventilation', 'hot', 'sweat', 'cool'],
      motion: ['motion', 'partner', 'disturbance', 'transfer', 'vibration'],
      noise: ['noise', 'squeak', 'creak', 'sound', 'loud'],
      durability: ['durable', 'durability', 'sag', 'sinking', 'dent', 'lasting', 'long lasting'],
      value: ['value', 'worth', 'price', 'expensive', 'deal', 'cost', 'budget'],
      shipping: ['delivery', 'packaging', 'box', 'courier', 'arrived', 'late', 'late delivery'],
      size: ['size', 'fit', 'dimension', 'king', 'queen', 'single', 'double', 'mattress size'],
    },
  },
  clothing: {
    re: /shirt|t.?shirt|jeans|pant|trouser|dress|top|kurta|saree|blouse|jacket|hoodie|sweater|shorts/i,
    aspects: {
      fabric: ['fabric', 'material', 'cotton', 'polyester', 'linen', 'silk', 'quality', 'thin', 'thick'],
      fit: ['fit', 'size', 'tight', 'loose', 'comfortable', 'shrunk', 'shrink', 'stretch'],
      color: ['color', 'colour', 'fade', 'faded', 'wash', 'bright', 'dark', 'light'],
      wash: ['wash', 'laundry', 'shrink', 'shrunk', 'color loss', 'fade', 'iron'],
      style: ['style', 'look', 'design', 'pattern', 'print', 'trendy', 'fashion'],
      comfort: ['comfortable', 'comfort', 'soft', 'rough', 'itchy', 'scratchy'],
      value: ['value', 'worth', 'price', 'expensive', 'deal', 'cost', 'budget'],
      shipping: ['delivery', 'packaging', 'courier', 'arrived', 'late'],
      durability: ['durable', 'stitching', 'stitch', 'tear', 'rip', 'loose thread', 'quality'],
    },
  },
  electronics: {
    re: /phone|smartphone|laptop|tablet|headphone|earbud|speaker|tv|monitor|camera|watch|smartwatch|gadget/i,
    aspects: {
      battery: ['battery', 'backup', 'charge', 'charging', 'duration', 'mah'],
      display: ['display', 'screen', 'panel', 'bright', 'oled', 'amoled', 'refresh rate', 'lcd', 'touchscreen'],
      performance: ['performance', 'fast', 'speed', 'lag', 'smooth', 'responsive', 'slow', 'processor', 'ram'],
      camera: ['camera', 'photo', 'snapshot', 'low light', 'night photo', 'video', 'selfie'],
      sound: ['sound', 'audio', 'bass', 'speaker', 'mic', 'microphone', 'noisy', 'quiet', 'volume'],
      software: ['software', 'update', 'firmware', 'app', 'bug', 'crash', 'bluetooth', 'wifi', 'os'],
      heating: ['heat', 'heating', 'thermal', 'overheat', 'gets warm', 'hot'],
      build: ['build', 'quality', 'plastic', 'metal', 'material', 'premium', 'finish'],
      value: ['value', 'worth', 'price', 'expensive', 'deal', 'cost'],
      shipping: ['delivery', 'packaging', 'box', 'courier', 'arrived'],
    },
  },
  beauty: {
    re: /shampoo|face.?wash|soap|cream|lotion|serum|moisturizer|sunscreen|makeup|skincare|haircare|dandruff|acne|pimple|conditioner|hair.?oil/i,
    aspects: {
      fragrance: ['fragrance', 'smell', 'scent', 'aroma', 'perfume', 'odor', 'smells good', 'smells bad'],
      texture: ['texture', 'creamy', 'smooth', 'thick', 'thin', 'lather', 'foam', 'gel', 'liquid'],
      results: ['effective', 'result', 'worked', 'reduced', 'reduction', 'improvement', 'noticeable', 'visible'],
      ingredients: ['ingredient', 'salicylic', 'acid', 'biotin', 'chemical', 'paraben', 'sulfate', 'natural', 'organic'],
      packaging: ['packaging', 'bottle', 'tube', 'container', 'leak', 'spill', 'travel friendly', 'pump'],
      skin: ['skin', 'hair', 'scalp', 'frizz', 'dry', 'oily', 'glow', 'rash', 'irritation'],
      scalp: ['scalp', 'itchy', 'flaky', 'dry scalp', 'oil scalp', 'sensitive scalp'],
      dandruff: ['dandruff', 'flake', 'flakes', 'dandruff reduction', 'anti dandruff'],
      hairfall: ['hair fall', 'hairfall', 'hair loss', 'hair thinning', 'regrowth'],
      value: ['value', 'worth', 'price', 'expensive', 'deal', 'cost'],
      shipping: ['delivery', 'packaging', 'courier', 'arrived'],
    },
  },
};

const ASPECT_WORDS = {
  battery: ['battery', 'backup', 'charge', 'charging', 'duration'],
  camera: ['camera', 'photo', 'snapshot', 'low light', 'night photo'],
  display: ['display screen', 'phone screen', 'oled', 'amoled', 'refresh rate', 'lcd', 'touchscreen'],
  comfort: ['comfortable', 'comfort', 'cushion'],
  durability: ['durable', 'durability', 'sturdy', 'break', 'crack', 'torn', 'peel', 'rust'],
  performance: [],
  value: ['value', 'worth', 'price', 'expensive', 'fair price', 'deal', 'cost'],
  build: ['build', 'quality', 'plastic', 'metal', 'material', 'premium', 'finish'],
  sound: ['sound', 'audio', 'bass', 'speaker', 'mic', 'microphone', 'noisy', 'quiet'],
  software: [],
  heating: [],
  size: [],
  shipping: ['delivery', 'shipping', 'packaging', 'box', 'courier', 'arrived'],
  support: ['support', 'warranty', 'service', 'customer care', 'replacement', 'refund'],
  waterproof: ['water', 'splash', 'rain', 'ipx', 'ip67', 'waterproof'],
};

const SPAM_HINTS = ['free shipping', 'click here', 'limited time', 'best sale ever', 'discount code', 'buy cheap', 'earn money', 'www.', 'http', 'subscribe'];

const POSITIVE_WORDS = ['good', 'great', 'excellent', 'awesome', 'perfect', 'fantastic', 'best', 'love', 'loved', 'amazing', 'impressed', 'recommend', 'recommended', 'satisfied', 'works', 'working', 'smooth', 'fast', 'comfortable', 'durable', 'sturdy', 'premium', 'nice', 'happy', 'pleased', 'worth', 'clear', 'sharp', 'crisp', 'quiet', 'strong', 'reliable', 'solid', 'bright', 'no issue'];
const NEGATIVE_WORDS = ['bad', 'terrible', 'awful', 'worst', 'poor', 'disappointed', 'disappointing', 'broken', 'broke', 'stopped', 'defective', 'defect', 'worse', 'unhappy', 'regret', 'waste', 'problem', 'problems', 'issue', 'issues', 'noisy', 'slow', 'lag', 'laggy', 'overheats', 'overheat', 'leak', 'not worth', 'uncomfortable', 'flimsy', 'cheap built', 'cracked', 'bleeding', 'drain', 'fake', 'useless', 'avoid'];

function norm(t) {
  return String(t || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
}

function isSpam(text) {
  const t = String(text || '').trim();
  if (!t) return true;
  if (/[@#%^*+]{3,}|https?:\/\/|www\./.test(t)) return true;
  const lower = t.toLowerCase();
  if (SPAM_HINTS.some((h) => lower.includes(h))) return true;
  if (lower.length > 40 && lower === lower.toUpperCase()) return true;
  const words = lower.split(/\s+/).filter(Boolean);
  const reps = words.filter((w, i) => w === words[i - 1]).length;
  if (words.length >= 6 && reps / words.length > 0.3) return true;
  return false;
}

function sentiment(rawText) {
  const t = norm(rawText);
  let score = 0;
  for (const w of POSITIVE_WORDS) if (t.includes(w)) score += 1;
  for (const w of NEGATIVE_WORDS) if (t.includes(w)) score -= 1.5;
  if (score >= 1.5) return 'positive';
  if (score <= -1) return 'negative';
  return 'neutral';
}

function detectCategory(text) {
  for (const [cat, def] of Object.entries(CATEGORY_ASPECTS)) {
    if (def.re.test(text)) return cat;
  }
  return null;
}

function aspectHits(text, category) {
  const t = norm(text);
  const hits = [];

  // Use category-specific aspects if detected
  if (category && CATEGORY_ASPECTS[category]) {
    const catAspects = CATEGORY_ASPECTS[category].aspects;
    for (const [key, words] of Object.entries(catAspects)) {
      for (const w of words) {
        const parts = w.split(/\s+/);
        const re = new RegExp(parts.map((p) => `\\b${p}\\b`).join('[^a-z]+'), 'i');
        if (re.test(t)) { hits.push(key); break; }
      }
    }
    return hits;
  }

  // Fallback to generic aspects
  for (const [key, words] of Object.entries(ASPECT_WORDS)) {
    for (const w of words) {
      const parts = w.split(/\s+/);
      const re = new RegExp(parts.map((p) => `\\b${p}\\b`).join('[^a-z]+'), 'i');
      if (re.test(t)) { hits.push(key); continue; }
    }
  }
  return hits;
}

function fakeScore(text, author, rating) {
  let s = 0;
  const t = String(text || '');
  if (!t.trim()) s += 1;
  if (/customer|customer\s*\d+|vendor/i.test(String(author || ''))) s += 0.5;
  if (t.length < 20 && rating === 5) s += 0.5;
  if (/\b(must buy|perfect product|best in the world)\b/i.test(t)) s += 0.5;
  return Math.min(2.5, s);
}

function analyze(reviews = [], opts = {}) {
  const max = opts.max || 400;
  const seed = (Array.isArray(reviews) ? reviews : []).slice(0, max);
  const seen = new Set();
  const cleaned = [];
  let spamRemoved = 0;
  let duplicatesRemoved = 0;

  // Detect product category from title/name for category-specific aspect matching
  const productText = opts.productName || opts.title || '';
  const category = detectCategory(productText);

  for (const r of seed) {
    const text = String(r.text || '').trim();
    const key = (text || String(r.title || '')).toLowerCase().slice(0, 140);
    if (seen.has(key)) { duplicatesRemoved += 1; continue; }
    seen.add(key);
    if (!key || isSpam(text || r.title)) { spamRemoved += 1; continue; }
    const rating = r.rating != null ? Math.min(5, Math.max(1, Number(r.rating))) : null;
    cleaned.push({
      author: r.author || null,
      rating,
      title: r.title || null,
      text,
      date: r.date || null,
      helpful: r.helpful != null ? Number(r.helpful) : 0,
      verified: Boolean(r.verified),
      source: r.source || 'page',
    });
  }

  const total = cleaned.length;
  const withRating = cleaned.filter((r) => r.rating != null);
  const avgRating = withRating.length ? withRating.reduce((s, r) => s + r.rating, 0) / withRating.length : null;

  const counters = { positive: 0, negative: 0, neutral: 0 };
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const enriched = cleaned.map((r) => {
    const polarity = polarityOf(r);
    const aspects = aspectHits(r.text, category);
    if (r.rating != null && dist[r.rating] != null) dist[r.rating] += 1;
    counters[polarity] += 1;
    return { ...r, polarity, aspects };
  });

  const starDistribution = withRating.length
    ? Object.fromEntries([1, 2, 3, 4, 5].map((k) => [`p${k}`, Math.round((dist[k] / withRating.length) * 100)]))
    : null;

  // When the store exposes the true per-star histogram (Amazon aria-labels etc.),
  // prefer it over the small sample distribution.
  const finalStarDistribution = opts.starOverride
    ? {
        p1: opts.starOverride['1_very_bad'],
        p2: opts.starOverride['2_bad'],
        p3: opts.starOverride['3_neutral'],
        p4: opts.starOverride['4_good'],
        p5: opts.starOverride['5_best'],
      }
    : starDistribution;

  const aspect = {};
  for (const r of enriched) {
    for (const a of r.aspects || []) {
      aspect[a] = aspect[a] || { pos: 0, neg: 0, total: 0, samples: [] };
      const m = aspect[a];
      m.total += 1;
      if (r.polarity === 'positive') m.pos += 1;
      else if (r.polarity === 'negative') m.neg += 1;
      if (m.samples.length < 2 && r.text) m.samples.push(r.text.slice(0, 240));
    }
  }

  const aspectSentiment = Object.fromEntries(
    Object.entries(aspect).map(([k, m]) => [
      k,
      {
        count: m.total,
        positivePct: Math.round((m.pos / m.total) * 100),
        negativePct: Math.round((m.neg / m.total) * 100),
        net: (m.pos - m.neg) / m.total,
        tone: m.pos > m.neg * 1.5 ? 'positive' : m.neg > m.pos * 1.5 ? 'negative' : 'mixed',
        samples: m.samples,
      },
    ])
  );

  const praises = Object.entries(aspectSentiment)
    .filter(([, m]) => m.positivePct >= 55)
    .sort((a, b) => b[1].positivePct - a[1].positivePct)
    .slice(0, 4)
    .map(([k, m]) => ({ key: k, weight: m.positivePct, topic: ASPECT_LABELS[k] || k }));

  const complaints = Object.entries(aspectSentiment)
    .filter(([, m]) => m.negativePct >= 50)
    .sort((a, b) => b[1].negativePct - a[1].negativePct)
    .slice(0, 4)
    .map(([k, m]) => ({ key: k, weight: m.negativePct, topic: ASPECT_LABELS[k] || k }));

  const recurringIssues = complaints.map((c) => ({
    aspect: c.key,
    title: c.topic,
    percent: c.weight,
    samples: aspectSentiment[c.key].samples,
  }));

  const positiveQuotes = enriched.filter((r) => r.polarity === 'positive').sort((a, b) => b.helpful - a.helpful).slice(0, 10).map((q) => ({ rating: q.rating, text: q.text, author: q.author }));
  const negativeQuotes = enriched.filter((r) => r.polarity === 'negative').sort((a, b) => b.helpful - a.helpful).slice(0, 10).map((q) => ({ rating: q.rating, text: q.text, author: q.author }));

  const fakeScore = enriched.reduce((s, r) => s + fakeScoreFor(r), 0);
  const fakeRate = total ? Math.min(100, Math.round((fakeScore / total) * 40)) : 0;
  const fakeRisk = fakeRate;

  const confidence = total >= 30 ? 85 : total >= 12 ? 70 : total >= 4 ? 55 : total >= 1 ? 40 : 20;

  return {
    present: total > 0,
    total,
    duplicatesRemoved,
    spamRemoved,
    avgRating: avgRating != null ? Math.round(avgRating * 10) / 10 : null,
    starDistribution: finalStarDistribution,
    positive: total ? Math.round((counters.positive / total) * 100) : null,
    neutral: total ? Math.round((counters.neutral / total) * 100) : null,
    negative: total ? Math.round((counters.negative / total) * 100) : null,
    praises: praises.length ? praises : null,
    complaints: complaints.length ? complaints : null,
    recurringIssues,
    aspectSentiment,
    positiveQuotes,
    negativeQuotes,
    fakeRisk,
    fakeFlags: Math.round(fakeScore / 2.5),
    confidence,
    processed: enriched.slice(0, 30).map((r) => ({ rating: r.rating, polarity: r.polarity, text: r.text, aspects: r.aspects })),
  };
}

function polarityOf(review) {
  const t = norm(review.text || '');
  let score = 0;
  for (const w of POSITIVE_WORDS) if (t.includes(w)) score += 1;
  for (const w of NEGATIVE_WORDS) if (t.includes(w)) score -= 1.5;
  if (score >= 1.5) return 'positive';
  if (score <= -1) return 'negative';
  if (review.rating != null && score === 0) {
    if (review.rating >= 4) return 'positive';
    if (review.rating <= 2) return 'negative';
  }
  return 'neutral';
}

function fakeScoreFor(r) {
  return fakeScore(r.text, r.author, r.rating);
}

function sentiment(text) {
  const t = norm(text);
  let score = 0;
  for (const w of POSITIVE_WORDS) if (t.includes(w)) score += 1;
  for (const w of NEGATIVE_WORDS) if (t.includes(w)) score -= 1.5;
  if (score >= 1.5) return 'positive';
  if (score <= -1) return 'negative';
  return 'neutral';
}

module.exports = { analyze, sentiment, isSpam, polarityOf, aspectHits };