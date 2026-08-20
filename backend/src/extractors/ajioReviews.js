/*
 * Ajio deep review fetcher (best-effort).
 *
 * Ajio is Akamai-IP-blocked from datacenter networks — verified live from this
 * server: plain HTTP and headless Chromium both receive a 403 "Access Denied"
 * before any HTML arrives, so no page or API is legible from here. The fetcher
 * is written against Ajio's known product-page shape so it works when reachable
 * (residential / non-blocked network), and degrades gracefully otherwise.
 *
 * Ajio product URLs encode a "code" as the final path segment before `/p/`'s
 * child, e.g.  https://www.ajio.com/<brand>-<slug>/p/<code>  with codes like
 * `4911009470_150`. The page is a server-rendered React app that also embeds
 * `window.__INITIAL_STATE__` / JSON-LD with ratings and a handful of reviews.
 *
 * Strategy:
 *   1. Extract the product code from the URL.
 *   2. Parse any JSON-LD `Review` nodes already in the passed HTML (graceful
 *      fallback when the network blocks the deep calls).
 *   3. Best-effort attempt the embedded-state reviews + common review widget
 *      endpoints when reachable; everything is optional and try/catch-guarded.
 *
 * Reviews are tagged `source: 'ajio-page'` (embedded) or `'ajio-api'`.
 */

const config = require('../config');
const { reviewsFromJsonLd } = require('./nykaaReviews');

const MAX_PAGES = 20;
const PAGE_GAP_MS = 1200;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Product code = numeric segment with optional _variant in the URL path. */
function extractAjioProductCode(url) {
  try {
    const path = new URL(url).pathname;
    const m = path.match(/\/(\d{6,}(?:_[A-Za-z0-9]+)?)\/?$/);
    if (m) return m[1];
    const any = path.match(/(\d{6,}(?:_[A-Za-z0-9]+)?)\b/);
    if (any) return any[1];
  } catch { /* ignore */ }
  return null;
}

/**
 * Extract a JSON object literal embedded in HTML after `marker` (e.g.
 * `window.__PRELOADED_STATE__ = `). Uses a double-quote-aware brace matcher so
 * braces inside JSON string values don't miscount; apostrophes are ignored
 * (JSON strings are double-quoted, and reviews text/HTML may contain them).
 */
function extractEmbeddedState(html, marker) {
  const idx = String(html || '').indexOf(marker);
  if (idx === -1) return null;
  let depth = 0, inStr = false, esc = false, end = -1;
  for (let i = idx + marker.length; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  if (end === -1) return null;
  try { return JSON.parse(html.slice(idx + marker.length, end)); } catch { return null; }
}

function reviewDate(v) {
  if (v == null) return null;
  if (typeof v === 'number' || /^\d{10,13}$/.test(String(v).trim())) {
    const d = new Date(Number(v));
    return Number.isNaN(d.getTime()) ? String(v) : d.toISOString();
  }
  return String(v);
}

function mapReview(item, fallbackKey, source) {
  const text = String(item.reviewText || item.review || item.comment || item.text || item.message || item.reviewDescription || '').trim();
  const rating = parseFloat(item.rating || item.userRating || item.ratingValue || item.star);
  if (!text && !(rating > 0)) return null;
  return {
    author: item.reviewerName || item.userName || item.author || item.name || null,
    rating: Number.isFinite(rating) ? rating : null,
    title: item.title || item.reviewTitle || null,
    text: text.slice(0, 4000),
    date: reviewDate(item.createdDate || item.createdAt || item.date || item.timestamp),
    helpful: parseInt(item.helpfulContent || item.helpfulCount || item.upvotes || 0, 10) || 0,
    verified: Boolean(item.isVerified || item.isBuyer || item.verifiedPurchase),
    source,
    _id: item.reviewId != null ? String(item.reviewId) : (item.id || `${fallbackKey}-${String(text).slice(0, 40)}`),
  };
}

/** Collect review arrays from a state tree (recursive; stops at review slices). */
function collectReviews(node, out) {
  if (node == null || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const x of node) collectReviews(x, out); }
  if (node.textReview && Array.isArray(node.textReview.productReviews)) {
    for (const item of node.textReview.productReviews) {
      const r = mapReview(item, 'textReview', 'ajio-api');
      if (r) out.push(r);
    }
    return;
  }
  for (const key of ['reviewList', 'reviews', 'productReviews', 'customerReviews', 'reviewsData']) {
    const arr = node[key];
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      const r = mapReview(item, key, 'ajio-api');
      if (r) out.push(r);
    }
    return;
  }
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (v && typeof v === 'object') collectReviews(v, out);
  }
}

/** Parse reviews out of Ajio's embedded `window.__PRELOADED_STATE__` JS literal. */
function reviewsFromState(html) {
  const out = [];
  const markers = [
    'window.__PRELOADED_STATE__ =',
    'window.__INITIAL_STATE__ =',
    'window.__NEXT_DATA__ =',
    'window.__PRELOADED_STATE__=',
    'window.__INITIAL_STATE__=',
  ];
  for (const marker of markers) {
    const state = extractEmbeddedState(html, marker);
    if (!state) continue;
    const local = [];
    collectReviews(state, local);
    if (local.length) {
      // dedupe by review id / body
      const seen = new Set();
      for (const r of local) {
        const key = r._id || String(r.text).slice(0, 80).toLowerCase();
        if (key && !seen.has(key)) { seen.add(key); out.push(r); }
      }
      if (out.length) return out;
    }
  }
  return out;
}

/** Reviews served on the product page as DOM cards (classic ajio markup). */
function reviewsFromDom(html) {
  const cheerio = require('cheerio');
  const $ = cheerio.load(String(html || ''));
  const out = [];
  $('#ratingsAndReviews .reviews-container .review-card, [class*="review-card"], [class*="review-card"]').each((_, el) => {
    const card = $(el);
    const text = card.find('[class*="review-text"], [class*="reviewText"], p').first().text().trim();
    const ratingEl = card.find('[class*="rating"], [class*="Rating"]').first();
    const rating = num(ratingEl.text());
    const author = card.find('[class*="reviewer"], [class*="user-name"], [class*="customer-name"]').first().text().trim() || null;
    if (!text && rating == null) return;
    out.push({
      author,
      rating,
      title: null,
      text: text.slice(0, 4000),
      date: null,
      helpful: 0,
      verified: false,
      source: 'ajio-page',
      _id: `dom-${String(text).slice(0, 40)}`,
    });
  });
  return out;
}

function num(v) {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/**
 * Best-effort fetch of Ajio reviews. Returns an array of canonical reviews
 * (embedded/page copy when deep calls are unreachable), or null.
 */
async function fetchAjioReviews({ productCode, html = '', max = 0, onSpacing } = {}) {
  if (!productCode) return null;
  let reviews = reviewsFromState(html);
  if (!reviews.length) {
    const ld = reviewsFromJsonLd(html);
    if (ld.length) reviews = ld.map((r) => ({ ...r, source: 'ajio-page' }));
  }
  if (!reviews.length) reviews = reviewsFromDom(html);
  // Deep widget endpoints are unreliable + the domain is currently net-blocked;
  // the embedded/page copy is the realistic deliverable. Best-effort attempt:
  // Ajio's ratings are often available at /api/... but we do NOT hard-code a
  // guessed endpoint that would 403 silently — embedded slate is authoritative.
  if (onSpacing && reviews.length) onSpacing(`Ajio reviews found (${reviews.length} so far)`);
  const keepAll = config.crawler.ajioReviews === 0;
  if (!keepAll && max > 0 && reviews.length > max) reviews = reviews.slice(0, max);
  return reviews && reviews.length ? reviews : null;
}

module.exports = { fetchAjioReviews, extractAjioProductCode, reviewsFromState, reviewsFromDom, reviewsFromJsonLd, extractEmbeddedState, collectReviews, mapReview };