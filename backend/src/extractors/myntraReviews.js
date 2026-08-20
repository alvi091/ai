/*
 * Myntra deep review fetcher.
 *
 * Myntra product pages server-render only ~3-6 "top" reviews inside
 * `window.__myx`; the full comment slate loads client-side from a JSON API:
 *   GET https://www.myntra.com/web/v1/reviews/product/<styleId>
 *       ?sortOrder=RECENCY&page=<n>&limit=200
 *   -> { reviews:[ { id, style:{id}, userRating, review, userName, upvotes,
 *                    downvotes, updatedAt, images, videos, status } ],
 *        reviewsMetaData:{ reviewCount, styleRating, ... } }
 *
 * Verified live: paginates until an empty page (claim 125 -> 126 unique),
 * ~12 comments per page regardless of `limit`. Products with no written
 * comments return an empty array (the page's "totalCount" is RATINGS, not
 * reviews). Falls back to the embedded `topReviews` copy if the API is down.
 */

const config = require('../config');

const PER_PAGE = 200;
const MAX_PAGES = 40;
const PAGE_GAP_MS = 1500;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function num(v) {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** Style id = last numeric path segment before /buy (e.g. .../20226154/buy). */
function extractMyntraStyleId(url) {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, '');
    const m = path.match(/\/(\d{5,})\/[^/]*$/);
    if (m) return m[1];
    const any = path.match(/\/(\d{5,})\b/);
    if (any) return any[1];
  } catch { /* ignore */ }
  return null;
}

/** Parse the server-rendered `window.__myx` blob (brace-matched). */
function myxState(html) {
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

/** Reviews already embedded in the page (topReviews + topImageReviews). */
function reviewsFromState(state) {
  const out = [];
  const ri = state && state.pdpData && state.pdpData.ratings && state.pdpData.ratings.reviewInfo;
  if (!ri) return out;
  const push = (entry) => {
    if (!entry) return;
    const text = String(entry.reviewText || entry.review || '').trim();
    const rating = num(entry.userRating);
    if (!text && rating == null) return;
    out.push({
      author: entry.userName || null,
      rating,
      title: null,
      text: text.slice(0, 4000),
      date: entry.timestamp ? new Date(Number(entry.timestamp)).toISOString() : null,
      helpful: num(entry.upvotes) || 0,
      verified: false,
      source: 'myntra-page',
      _id: entry.reviewId || entry.id || null,
    });
  };
  for (const e of ri.topReviews || []) push(e);
  for (const e of ri.topImageReviews || []) push(e);
  return out;
}

function mapApiReview(x) {
  if (!x) return null;
  const text = String(x.review || '').trim();
  const rating = num(x.userRating);
  if (!text && rating == null) return null;
  return {
    author: x.userName || null,
    rating,
    title: null,
    text: text.slice(0, 4000),
    date: x.updatedAt ? new Date(Number(x.updatedAt)).toISOString() : null,
    helpful: num(x.upvotes) || 0,
    verified: false,
    source: 'myntra-api',
    _id: x.id || null,
  };
}

function apiGet(styleId, page) {
  const qs = new URLSearchParams({ sortOrder: 'RECENCY', page: String(page), limit: String(PER_PAGE) }).toString();
  return new Promise((resolve) => {
    const req = require('https').request(
      {
        hostname: 'www.myntra.com',
        port: 443,
        path: `/web/v1/reviews/product/${styleId}?${qs}`,
        method: 'GET',
        headers: {
          Host: 'www.myntra.com',
          'User-Agent': config.crawler.userAgent,
          Accept: 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'x-myntra-fe': '1',
          Origin: 'https://www.myntra.com',
          Referer: `https://www.myntra.com/`,
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
        },
        timeout: 25000,
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (c) => { body += c; if (body.length > 8 * 1024 * 1024) req.destroy(); });
        res.on('end', () => resolve({ status: res.statusCode, body }));
        res.on('error', () => resolve({ status: 0, body: '', error: 'response error' }));
      }
    );
    req.on('error', (e) => resolve({ status: 0, body: '', error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: '', error: 'timeout' }); });
    req.end();
  });
}

/**
 * Paginate the Myntra reviews API until an empty/failed page. Stops early on
 * 4xx (bad style id) and surfaces `totalCount` from reviewsMetaData when present.
 * Returns { reviews, totalCount, blocked }.
 */
async function fetchViaApi(styleId, onSpacing) {
  const all = [];
  const seen = new Set();
  let blockedStrikes = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    let res = await apiGet(styleId, page);
    if (res.status !== 200) {
      if (res.status === 400 || res.status === 404 || res.status === 401) break; // bad product id
      blockedStrikes += 1;
      if (blockedStrikes >= 2) break; // persistent block → embedded copy is better
      if (onSpacing) onSpacing('Myntra reviews API is rate-limiting — retrying…');
      await sleep(4000);
      res = await apiGet(styleId, page);
      if (res.status !== 200) break;
    }

    let json = null;
    try { json = JSON.parse(res.body); } catch { break; }
    const revs = Array.isArray(json && json.reviews) ? json.reviews : [];
    let added = 0;
    for (const item of revs) {
      const r = mapApiReview(item);
      if (!r) continue;
      const key = r._id || String(r.text).slice(0, 120).toLowerCase();
      if (key && !seen.has(key)) { seen.add(key); all.push(r); added += 1; }
    }
    const totalCount = num(json && json.reviewsMetaData && json.reviewsMetaData.reviewCount) || null;
    if (totalCount != null && all.length >= totalCount) break;
    if (added === 0 || revs.length === 0) break;
    if (onSpacing) onSpacing(`Reading Myntra reviews (${all.length} so far)`);
    await sleep(PAGE_GAP_MS);
  }
  return { reviews: all, blocked: blockedStrikes >= 2 };
}

/**
 * Fetch review comments for a Myntra product. Returns an array of canonical
 * reviews (full API slate when available, else the embedded page copy), or null.
 */
async function fetchMyntraReviews({ styleId, html = '', max = 0, onSpacing } = {}) {
  if (!styleId) return null;

  const embedded = reviewsFromState(myxState(html));
  let origin = null;
  try {
    const api = await fetchViaApi(styleId, onSpacing);
    const keepAll = config.crawler.myntraReviews === 0;
    origin = (api.reviews && api.reviews.length) ? api.reviews : (api.blocked ? embedded : embedded);
    if (!keepAll && max > 0 && origin.length > max) origin = origin.slice(0, max);
    if (!origin.length) origin = embedded;
  } catch {
    origin = embedded;
  }
  return origin && origin.length ? origin : null;
}

module.exports = { fetchMyntraReviews, extractMyntraStyleId, myxState, reviewsFromState };