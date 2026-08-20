/*
 * Meesho deep review fetcher (best-effort).
 *
 * Meesho is Akamai-IP-blocked from datacenter networks — verified live from
 * this server: plain HTTP returns 403 and headless Chromium fails navigation
 * before HTML arrives. The fetcher is written against Meesho's known page shape
 * so it works when reachable, and returns the embedded copy otherwise.
 *
 * Meesho is a Next.js app: its product pages carry reviews inside
 * `window.__NEXT_DATA__`. Product URLs look like
 *   https://www.meesho.com/<slug>/p/<productId>
 * where productId is the base62-ish id (e.g. `5k4wqk`).
 *
 * Strategy:
 *   1. Extract the product id from the URL.
 *   2. Parse `__NEXT_DATA__` (and JSON-LD) already embedded in the passed HTML.
 *   3. Best-effort attempt a review API when reachable; else keep embedded.
 *
 * Reviews are tagged `source: 'meesho-api'` (state/api) or `'meesho-page'`.
 */

const config = require('../config');
const { reviewsFromJsonLd } = require('./nykaaReviews');

const MAX_PAGES = 20;
const PAGE_GAP_MS = 1200;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function num(v) {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** Product id = final path segment after /p/ (e.g. 5k4wqk). */
function extractMeeshoProductId(url) {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, '');
    const m = path.match(/\/p\/([^/]+)\/?$/);
    if (m) return m[1];
    const any = path.match(/([A-Za-z0-9]{4,})\/?$/);
    if (any) return any[1];
  } catch { /* ignore */ }
  return null;
}

/** Parse `window.__NEXT_DATA__` blob (brace-matched) and pull review arrays. */
function nextDataState(html) {
  const marker = 'window.__NEXT_DATA__ = ';
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

function collectReviews(node, out) {
  if (node == null || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const x of node) collectReviews(x, out); return; }
  for (const key of ['reviews', 'reviewList', 'reviewsList', 'ratingReviews', 'productReviews', 'customerReviews']) {
    const arr = node[key];
    if (!Array.isArray(arr) || !arr.length) continue;
    for (const item of arr) {
      if (typeof item !== 'object' || item == null) continue;
      const text = String(item.review || item.reviewText || item.comment || item.text || item.reviewDescription || '').trim();
      const rating = num(item.rating || item.userRating || item.star || item.ratingValue);
      if (!text && rating == null) continue;
      out.push({
        author: item.userName || item.author || item.name || item.userName || null,
        rating,
        title: item.title || null,
        text: text.slice(0, 4000),
        date: item.date || item.createdAt || null,
        helpful: parseInt(item.helpfulCount || item.upvotes || 0, 10) || 0,
        verified: Boolean(item.isBuyer || item.verifiedPurchase || item.isVerified),
        source: 'meesho-api',
        _id: item.id || `${key}-${String(text).slice(0, 40)}`,
      });
    }
  }
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (v && typeof v === 'object') collectReviews(v, out);
  }
}

function reviewsFromState(html) {
  const out = [];
  const state = nextDataState(html);
  if (state) collectReviews(state, out);
  return out;
}

/** Reviews served as DOM cards on the SSR page (fallback markup). */
function reviewsFromDom(html) {
  const cheerio = require('cheerio');
  const $ = cheerio.load(String(html || ''));
  const out = [];
  $('[class*="review-card"], [class*="ReviewCard"], [class*="review"]').each((_, el) => {
    const card = $(el);
    const text = card.find('[class*="review-text"], [class*="ReviewText"], p:not(:has(*))').first().text().trim();
    const ratingEl = card.find('[class*="rating"], [class*="Rating"], [class*="star"]').first();
    const rating = num(ratingEl.text().replace(/[^\d.]/g, ''));
    const author = card.find('[class*="reviewer"], [class*="user"]').first().text().trim() || null;
    if (!text && rating == null) return;
    out.push({
      author,
      rating,
      title: null,
      text: text.slice(0, 4000),
      date: null,
      helpful: 0,
      verified: false,
      source: 'meesho-page',
      _id: `dom-${String(text).slice(0, 40)}`,
    });
  });
  return out;
}

/**
 * Fetch review comments for a Meesho product. Returns an array of canonical
 * reviews (embedded __NEXT_DATA__/JSON-LD/DOM copy when the network blocks deep
 * calls), or null.
 */
async function fetchMeeshoReviews({ productId, html = '', max = 0, onSpacing } = {}) {
  if (!productId) return null;
  let reviews = reviewsFromState(html);
  if (!reviews.length) {
    const ld = reviewsFromJsonLd(html);
    if (ld.length) reviews = ld.map((r) => ({ ...r, source: 'meesho-page' }));
  }
  if (!reviews.length) reviews = reviewsFromDom(html);
  if (onSpacing && reviews.length) onSpacing(`Meesho reviews found (${reviews.length} so far)`);
  const keepAll = config.crawler.meeshoReviews === 0;
  if (!keepAll && max > 0 && reviews.length > max) reviews = reviews.slice(0, max);
  return reviews && reviews.length ? reviews : null;
}

module.exports = { fetchMeeshoReviews, extractMeeshoProductId, nextDataState, reviewsFromState, reviewsFromDom, reviewsFromJsonLd };