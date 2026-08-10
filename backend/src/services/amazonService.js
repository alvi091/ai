const prisma = require('../database');

const HOST = process.env.RAPIDAPI_HOST || 'real-time-amazon-data.p.rapidapi.com';
const KEY = process.env.RAPIDAPI_KEY || '';
const DEFAULT_COUNTRY = process.env.AMAZON_COUNTRY || 'US';
const SEARCH_TTL = parseInt(process.env.AMAZON_SEARCH_TTL_MS, 10) || 6 * 60 * 60 * 1000;
const DETAIL_TTL = parseInt(process.env.AMAZON_DETAIL_TTL_MS, 10) || 24 * 60 * 60 * 1000;

function enabled() {
  return Boolean(KEY);
}

async function apiGet(path, params) {
  const url = new URL(`https://${HOST}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      headers: {
        'x-rapidapi-key': KEY,
        'x-rapidapi-host': HOST,
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Amazon API HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    const json = await res.json();
    if (json && json.message && json.data === undefined) throw new Error(json.message);
    return json;
  } finally {
    clearTimeout(timer);
  }
}

function parsePrice(v) {
  if (v == null || v === '') return null;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function pickImage(item) {
  return item.product_main_image_url
    || item.product_photo
    || (Array.isArray(item.product_photos) && item.product_photos[0])
    || null;
}

const CATEGORY_HINTS = [
  { words: ['headphone', 'earbud', 'speaker', 'laptop', 'phone', 'smartphone', 'tablet', 'camera', 'television', 'tv ', 'monitor', 'keyboard', 'mouse', 'charger', 'cable', 'drone', 'watch', 'console', 'router', 'printer'], category: 'Electronics' },
  { words: ['shirt', 'jeans', 'dress', 'jacket', 'hoodie', 'shoes', 'boots', 'sneaker', 'sandal', 'sock', 'trouser', 'shorts', 't-shirt', 'tshirt', 'coat', 'blazer'], category: 'Fashion' },
  { words: ['book', 'notebook', 'pen', 'stationery', 'journal', 'pencil'], category: 'Books & Stationery' },
  { words: ['toy', 'game', 'lego', 'doll', 'puzzle', 'action figure', 'plush'], category: 'Toys & Games' },
  { words: ['gym', 'yoga', 'dumbbell', 'bicycle', 'treadmill', 'running', 'fitness', 'basketball', 'football', 'tennis'], category: 'Sports & Outdoors' },
  { words: ['skincare', 'makeup', 'shampoo', 'lotion', 'cream', 'perfume', 'fragrance', 'serum', 'beauty'], category: 'Beauty & Personal Care' },
  { words: ['food', 'snack', 'coffee', 'tea', 'chocolate', 'grocery', 'oil', 'spice'], category: 'Groceries & Food' },
  { words: ['sofa', 'chair', 'table', 'desk', 'lamp', 'bed', 'mattress', 'kitchen', 'cookware', 'blender', 'vacuum', 'furniture', 'decor'], category: 'Home & Kitchen' },
  { words: ['dog', 'cat', 'pet', 'leash', 'collar', 'aquarium'], category: 'Pet Supplies' },
  { words: ['car', 'bike', 'tire', 'oil', 'battery', 'automotive', 'windshield'], category: 'Automotive' },
];

function guessCategory(item) {
  const title = String(item.product_title || '');
  const cat = item.product_category || item.category || '';
  const hay = `${title} ${cat}`.toLowerCase();
  for (const hint of CATEGORY_HINTS) {
    if (hint.words.some((w) => hay.includes(w))) return hint.category;
  }
  return 'General';
}

function extractBrand(title) {
  const words = String(title || '').trim().split(/\s+/);
  return words.length > 2 ? words.slice(0, 2).join(' ') : (words[0] || 'Amazon');
}

function mapItem(item) {
  const price = parsePrice(item.product_price);
  const original = parsePrice(item.product_original_price);
  const photos = Array.isArray(item.product_photos) ? item.product_photos.filter(Boolean) : [];
  const image = pickImage(item);
  return {
    id: `amz:${item.asin}`,
    asin: item.asin,
    name: item.product_title || `Amazon product ${item.asin}`,
    brand: item.product_by_seller || item.product_by || item.brand || extractBrand(item.product_title),
    category: guessCategory(item),
    price,
    originalPrice: original != null && price != null && original > price ? original : null,
    rating: parseFloat(item.product_star_rating) || 0,
    reviews: parseInt(item.product_num_ratings, 10) || 0,
    image,
    images: photos.length ? photos : [image].filter(Boolean),
    url: item.product_url || `https://www.amazon.com/dp/${item.asin}`,
    description: item.product_description || item.product_subtitle || '',
    currency: item.currency || 'USD',
    source: 'amazon',
  };
}

function mapReview(r) {
  return {
    author: r.review_author || r.review_title || 'Verified buyer',
    rating: parseFloat(r.review_star_rating) || parseFloat(r.star_rating) || 3,
    comment: r.review_content || r.comment || '',
    title: r.review_title || r.title || null,
    date: r.review_date || r.date || null,
    helpful_votes: parseInt(r.helpful_votes || r.helpful, 10) || 0,
    verified_purchase: r.verified_purchase === true || r.verified_purchase === 'true',
  };
}

function mapDetail(d) {
  const base = mapItem(d);
  const details = d.product_details || d.product_information || {};
  const reviews = Array.isArray(d.reviews) ? d.reviews.map(mapReview).filter((r) => r.comment) : [];
  let rating_breakdown = null;
  if (d.rating_breakdown && typeof d.rating_breakdown === 'object') {
    rating_breakdown = d.rating_breakdown;
  }
  const brand = details.brand || details.Brand || d.product_by_seller || base.brand;
  const image = d.product_main_image_url || base.image;
  const photos = Array.isArray(d.product_photos) && d.product_photos.length
    ? d.product_photos
    : [image].filter(Boolean);
  return {
    ...base,
    brand,
    image,
    images: photos,
    description: d.product_description || d.product_subtitle || base.description,
    rating_breakdown,
    reviewSamples: reviews.slice(0, 40),
    reviewsCount: base.reviews,
    bestsellerRank: d.bestseller_rank || null,
    dimensions: details['item dimensions l x w x h'] || details['item dimensions'] || null,
    color: details.color || null,
    model: details['model number'] || details.model || null,
  };
}

async function readCache(cacheKey, ttl) {
  const row = await prisma.amazonCache.findUnique({ where: { cacheKey } });
  if (!row) return null;
  const age = Date.now() - new Date(row.fetchedAt).getTime();
  if (age > ttl) return null;
  return row.data;
}

async function writeCache(cacheKey, data) {
  try {
    await prisma.amazonCache.upsert({
      where: { cacheKey },
      update: { data, fetchedAt: new Date() },
      create: { cacheKey, data },
    });
  } catch { /* cache is best-effort */ }
}

async function upsertProduct(mapped) {
  const images = Array.isArray(mapped.images) ? JSON.stringify(mapped.images) : null;
  const pros = JSON.stringify(mapped.pros || []);
  const cons = JSON.stringify(mapped.cons || []);
  const reviewSamples = mapped.reviewSamples ? JSON.stringify(mapped.reviewSamples) : null;
  const base = {
    name: mapped.name,
    brand: mapped.brand,
    category: mapped.category,
    price: mapped.price,
    originalPrice: mapped.originalPrice,
    description: mapped.description || `Product on Amazon${mapped.brand ? ` by ${mapped.brand}` : ''}.`,
    image: mapped.image || `https://placehold.co/600x600?text=${encodeURIComponent(mapped.asin)}`,
    images,
    rating: mapped.rating,
    reviews: mapped.reviews,
    features: null,
    pros,
    cons,
    affiliateLink: mapped.url,
    inStock: true,
    marketplace: 'Amazon',
    source: 'amazon',
    asin: mapped.asin,
    productUrl: mapped.url,
  };
  const update = { ...base };
  if (reviewSamples) update.reviewSamples = reviewSamples;
  return prisma.product.upsert({
    where: { id: mapped.id },
    update,
    create: { id: mapped.id, ...base, reviewSamples },
  });
}

const STOPWORDS = new Set([
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'a', 'an', 'the', 'and', 'or', 'but', 'for', 'with', 'under', 'over',
  'need', 'want', 'looking', 'find', 'best', 'good', 'great', 'buy', 'cheap', 'max', 'budget', 'around', 'about',
  'something', 'that', 'this', 'these', 'those', 'what', 'which', 'have', 'has', 'please', 'please', 'help',
  'shoes', 'for', 'to', 'of', 'in', 'on', 'at', 'by', 'is', 'are', 'be', 'my', 'us',
]);

function toKeywords(query) {
  return String(query || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w) && !/^\d+$/.test(w))
    .slice(0, 6)
    .join(' ');
}

async function searchProducts(query, page = 1, country = DEFAULT_COUNTRY) {
  if (!enabled()) throw new Error('RAPIDAPI_KEY not configured');
  const raw = String(query || '').trim().slice(0, 120);
  if (!raw) throw new Error('query required');
  const clean = toKeywords(raw) || raw;
  const cacheKey = `search:${country}:${clean.toLowerCase()}:${page}`;

  const cached = await readCache(cacheKey, SEARCH_TTL);
  if (cached && Array.isArray(cached.products)) {
    const products = cached.products.map(mapItem);
    return { products, cached: true, total: cached.total_results != null ? cached.total_results : products.length };
  }

  const json = await apiGet('/product-search', { query: clean, country, page });
  const list = json.data && Array.isArray(json.data.products) ? json.data.products : [];
  await writeCache(cacheKey, {
    products: list.map((it) => mapItem(it)),
    total_results: json.data.total_results || list.length,
  });

  const products = [];
  for (const item of list) {
    const mapped = mapItem(item);
    products.push(mapped);
    try { await upsertProduct(mapped); } catch { /* keep going on partial failure */ }
  }

  return { products, cached: false, total: json.data.total_results != null ? json.data.total_results : products.length };
}

async function getProductByAsin(asin, country = DEFAULT_COUNTRY) {
  if (!enabled()) throw new Error('RAPIDAPI_KEY not configured');
  const clean = String(asin || '').trim();
  if (!clean) throw new Error('asin required');
  const id = `amz:${clean}`;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (existing) {
    const fresh = Date.now() - new Date(existing.updatedAt).getTime() <= DETAIL_TTL;
    if (fresh && existing.reviewSamples) {
      return { product: existing, cached: true };
    }
  }

  const json = await apiGet('/product-details', { asin: clean, country });
  const detail = mapDetail(json.data || json);
  const saved = await upsertProduct(detail);
  return { product: saved, cached: false };
}

async function syncCatalog(queries = []) {
  if (!enabled()) throw new Error('RAPIDAPI_KEY not configured');
  const qs = Array.isArray(queries) && queries.length
    ? queries
    : ['wireless headphones', 'laptop', 'smartphone', 'running shoes', 'coffee maker', 'yoga mat', 'desk chair', 'skincare', 'lego', 'pet bed'];
  const report = [];
  let total = 0;
  for (const q of qs) {
    try {
      const { products, cached } = await searchProducts(q, 1);
      total += products.length;
      report.push({ query: q, products: products.length, cached });
    } catch (e) {
      report.push({ query: q, products: 0, error: e.message });
    }
  }
  return { queries: report, totalProducts: total };
}

module.exports = { searchProducts, getProductByAsin, syncCatalog, enabled };
