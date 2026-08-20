/*
 * Structured extractor — pulls product data out of client-side storefronts.
 *
 * Amplifies the existing metadataHarvester (JSON-LD / OG / microdata) with the
 * `window.__NEXT_DATA__` embedded state that Next.js/React storefronts (Noon,
 * Meesho, Namshi, Flipkart...) ship inside a `<script id="__NEXT_DATA__">` blob.
 * That blob usually contains the full product as JSON, which is far more
 * reliable than visual DOM selectors.
 *
 * Structured data is merged upstream and takes precedence over DOM extraction.
 */

const cheerio = require('cheerio');

function asArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function num(v) {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function extractNextData(html) {
  const $ = cheerio.load(html);
  const script = $('#__NEXT_DATA__').text();
  if (!script) return null;
  try {
    return JSON.parse(script);
  } catch {
    return null;
  }
}

// Deep-search a JSON tree for the first object that looks like a product.
// "Looks like a product": has a name/title AND (a price OR an sku/images).
function findProductNode(root, depth = 0) {
  if (depth > 12 || root == null || typeof root !== 'object') return null;
  const stack = [root];
  while (stack.length) {
    const node = stack.pop();
    if (node == null || typeof node !== 'object') continue;
    if (Array.isArray(node)) {
      for (const item of node) stack.push(item);
      continue;
    }
    const name = node.name || node.title || node.productName || node.productTitle;
    const hasIdentity = Boolean(name);
    const price = num(node.price || node.salePrice || (node.priceInfo && node.priceInfo.price));
    const hasSku = Boolean(node.sku || node.id || node.asin || node.productId);
    const hasImg = Boolean(node.image || node.productImage || (node.images && node.images.length));
    if (hasIdentity && (price != null || hasSku || hasImg)) return node;
    // recurse into values (avoid already-visited keys blowing the stack)
    for (const key of Object.keys(node)) {
      if (key === 'children') continue;
      const val = node[key];
      if (val && typeof val === 'object') stack.push(val);
    }
  }
  return null;
}

function normalizeFromNext(data, siteId) {
  const node = findProductNode(data);
  if (!node) return {};
  const name = node.name || node.title || node.productName || node.productTitle || null;
  const price = num(node.price || node.salePrice || (node.priceInfo && node.priceInfo.price));
  const original = num(node.originalPrice || node.listPrice || node.mrp || (node.priceInfo && node.priceInfo.originalPrice));
  const images = asArray(node.images || node.imageGallery || node.productImages)
    .map((i) => (typeof i === 'object' ? i.url || i.image || i.src : i))
    .filter(Boolean);
  const mainImage = typeof node.image === 'string' ? node.image : images[0] || null;
  const aggRating = node.rating || node.ratingValue || (node.averageRating && node.averageRating.value);
  const rating = num(aggRating);
  const reviewsNode = node.reviews || node.ratingCount || (node.reviewCount);
  const ratingCount = num(node.ratingCount || node.ratingsCount || (node.averageRating && node.averageRating.count) || node.reviewCount || node.reviewsCount);
  const reviewCount = num(node.reviewCount || node.reviewsCount);
  const description = node.description || node.productDescription || null;
  const sku = node.sku || node.productId || node.id || null;
  const category = node.category || (node.categories && asArray(node.categories).join(' / ')) || null;
  const brand = node.brand || node.brandName || null;

  let reviews = [];
  const reviewArr = asArray(node.reviews && node.reviews.length ? node.reviews : (node.reviewList || []));
  for (const r of reviewArr) {
    const comment = r.comment || r.text || r.reviewText || r.content || r.message || '';
    if (!comment) continue;
    reviews.push({
      author: r.author || r.userName || r.name || null,
      rating: num(r.rating || r.star) || null,
      title: r.title || r.subject || null,
      text: String(comment).slice(0, 2000),
      date: r.date || r.createdAt || r.datePublished || null,
      verified: Boolean(r.verified || r.verifiedPurchase),
      helpful_votes: num(r.helpfulCount || r.helpfulVotes) || 0,
    });
  }

  return {
    title: name,
    brand,
    price: price != null ? price : null,
    originalPrice: original != null && original > price ? original : null,
    currency: node.currency || (node.priceInfo && node.priceInfo.currency) || 'AED',
    image: mainImage,
    images,
    sku,
    model: node.model || null,
    category,
    description,
    rating,
    ratingCount,
    reviewCount,
    reviews,
    _fromNext: true,
  };
}

/**
 * Main entry: extract structured product data from rendered HTML for a store.
 * Returns a merged object sorted so existing harvester signals can be layered
 * over the __NEXT_DATA__ result.
 */
function extractStructured(html, { siteId = null, baseUrl = null } = {}) {
  const nextData = extractNextData(html);
  let nextExtracted = {};
  if (nextData) {
    try {
      nextExtracted = normalizeFromNext(nextData, siteId);
    } catch { nextExtracted = {}; }
  }
  return {
    __nextDataPresent: Boolean(nextData),
    ...nextExtracted,
  };
}

module.exports = { extractStructured, extractNextData, findProductNode };
