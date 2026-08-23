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

function extractMyxState(html) {
  const marker = 'window.__myx = ';
  const idx = String(html || '').indexOf(marker);
  if (idx === -1) return null;
  let depth = 0, end = -1;
  for (let i = idx + marker.length; i < html.length; i++) {
    const c = html[i];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  if (end === -1) return null;
  try { return JSON.parse(html.slice(idx + marker.length, end)); } catch { return null; }
}

function normalizeFromMyx(myx) {
  const pdp = myx && myx.pdpData;
  if (!pdp) return {};
  const base = pdp.productInfo || pdp.product || {};
  const style = (pdp.analytics && pdp.analytics.style) || base.style || base;
  const title = (style && (style.styleName || style.name || style.productName)) || base.name || base.title || null;
  const brand = (style && (style.brand || style.brandName)) || base.brand || null;
  let price = null, original = null, currency = null;
  const pr = pdp.priceInfo || base.priceInfo || {};
  if (pr) {
    price = num(pr.finalPrice || pr.salePrice || pr.price || pr.offerPrice);
    original = num(pr.originalPrice || pr.mrp || pr.mrpPrice || pr.oldPrice);
    currency = pr.currency || 'INR';
  }
  if (price == null) price = num(base.salePrice || base.finalPrice || base.price || base.offerPrice);
  if (original == null) original = num(base.originalPrice || base.mrp || base.listPrice);
  const images = asArray(base.images || base.image || pdp.images || (pdp.productImageGroup && pdp.productImageGroup.images))
    .map((i) => (typeof i === 'object' ? i.src || i.url || i.image : i))
    .filter(Boolean);
  const mainImage = images[0] || (typeof base.image === 'string' ? base.image : null);
  const rating = num(pdp.ratings && pdp.ratings.ratingsInfo && pdp.ratings.ratingsInfo.averageRating)
    || num(base.rating || base.ratingValue);
  const ratingCount = num(pdp.ratings && pdp.ratings.ratingsInfo && pdp.ratings.ratingsInfo.ratingCount)
    || num(base.ratingCount || base.ratingsCount);
  const reviewCount = num(pdp.ratings && pdp.ratings.ratingsInfo && pdp.ratings.ratingsInfo.reviewCount)
    || num(pdp.ratings && pdp.ratings.reviewInfo && pdp.ratings.reviewInfo.totalReviewCount)
    || num(base.reviewCount);
  const description = (base.longDescription || base.shortDescription || base.description || (pdp.features && pdp.features.length && pdp.features.map((f) => f.description || f.title || f).join('\n')) || null);
  const sku = (style && (style.styleId || style.id || style.productId)) || base.sku || base.id || base.productId || null;
  const category = (style && (style.analyticsCategory || style.category)) || base.category || base.productCategory || null;
  const reviewList = [];
  const reviewInfo = pdp.ratings && pdp.ratings.reviewInfo;
  if (reviewInfo) {
    for (const entry of [...(reviewInfo.topReviews || []), ...(reviewInfo.topImageReviews || [])]) {
      const text = String(entry && (entry.reviewText || entry.review || entry.comment) || '').trim();
      const ratingVal = num(entry && entry.userRating);
      if (!text && ratingVal == null) continue;
      reviewList.push({
        author: entry.userName || null,
        rating: ratingVal,
        text: text.slice(0, 2000),
        date: entry.timestamp ? new Date(Number(entry.timestamp)).toISOString() : null,
        verified: Boolean(entry.certifiedBuyer || entry.verified || entry.isCertifiedBuyer),
        helpful_votes: num(entry.upvotes || entry.helpfulCount) || 0,
      });
    }
  }
  return {
    title,
    brand,
    price: price != null ? price : null,
    originalPrice: original != null && original > price ? original : null,
    currency: currency || 'INR',
    image: mainImage,
    images,
    sku,
    category,
    description,
    rating,
    ratingCount,
    reviewCount,
    reviews: reviewList,
    _fromMyx: true,
  };
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
  const myxState = extractMyxState(html);
  let myxExtracted = {};
  if (myxState) {
    try {
      myxExtracted = normalizeFromMyx(myxState);
    } catch { myxExtracted = {}; }
  }
  const merged = {
    ...nextExtracted,
    ...myxExtracted,
    reviews: [
      ...(myxExtracted.reviews || []),
      ...(nextExtracted.reviews || []),
    ],
  };
  return {
    __nextDataPresent: Boolean(nextData),
    __myxPresent: Boolean(myxState),
    ...merged,
  };
}

module.exports = { extractStructured, extractNextData, extractMyxState, findProductNode };
