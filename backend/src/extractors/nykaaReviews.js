/*
 * Nykaa deep review fetcher (best-effort).
 *
 * Nykaa product pages are client-rendered and hard-IP-blocked (Akamai) from
 * datacenter networks — verified live from this server: every UA + Playwright
 * gets a 403 before any HTML is returned. Reviews are served from a public
 * gateway API when reachable:
 *
 *   GET https://www.nykaa.com/gateway-api/products/<productId>/reviews
 *       ?page=<n>&pagesize=<perPage>&sortBy=MOST_RECENT
 *   -> sample item: { id, child_id, title, description, name, created_on,
 *                     rating, like_count, is_buyer, images, ... }
 *
 * Strategy:
 *   1. Extract the numeric product id from the URL path (last numeric segment).
 *   2. Parse any reviews already embedded in the passed page HTML
 *      (JSON-LD `Review` entries + DOM cards), used as the graceful fallback.
 *   3. Attempt the gateway reviews API when reachable; paginate until an empty
 *      page. Any block / auth error falls back to the embedded copy.
 *
 * Reviews are tagged `source: 'nykaa-api'` or `'nykaa-page'`. When the network
 * blocks the domain entirely the extractor returns the embedded copy (often
 * empty) and the pipeline's store-block note governs the user-facing message.
 */

const config = require('../config');

const PER_PAGE = 20;
const MAX_PAGES = 40;
const PAGE_GAP_MS = 1200;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function num(v) {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** Nykaa product id = last numeric path segment (e.g. .../maybelline/.../p/1044693). */
function extractNykaaProductId(url) {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, '');
    const last = path.match(/(\d{4,})\/?$/);
    if (last) return last[1];
    const any = path.match(/(\d{4,})\b/);
    if (any) return any[1];
  } catch { /* ignore */ }
  return null;
}

/** Parse JSON-LD `Review` nodes plus `itemReviewed` aggregate rating. */
function reviewsFromJsonLd(html) {
  const out = [];
  const scripts = String(html || '').match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) || [];
  for (const script of scripts) {
    const body = script.replace(/<script[^>]*>|<\/script>/gi, '');
    let data;
    try { data = JSON.parse(body); } catch { continue; }
    const items = [].concat(data.review && Array.isArray(data.review) ? data.review : []);
    const list = data['@graph'] && Array.isArray(data['@graph'])
      ? data['@graph'].filter((x) => x['@type'] === 'Review')
      : items;
    for (const r of list) {
      const text = String(r.reviewBody || r.description || '').trim();
      const rating = num((r.reviewRating && r.reviewRating.ratingValue) || r.rating);
      if (!text && rating == null) continue;
      const author = ((r.author && r.author.name) || null);
      out.push({
        author,
        rating,
        title: r.name || null,
        text: text.slice(0, 4000),
        date: r.datePublished || null,
        helpful: 0,
        verified: false,
        source: 'nykaa-page',
        _id: r['@id'] || `ld-${String(text).slice(0, 40)}`,
      });
    }
  }
  return out;
}

function mapApiReview(x) {
  if (!x) return null;
  const text = String(x.description || x.review || '').trim();
  const rating = num(x.rating);
  if (!text && rating == null) return null;
  return {
    author: x.name || x.userName || x.review_author || null,
    rating,
    title: x.title || null,
    text: text.slice(0, 4000),
    date: x.created_on || x.date || null,
    helpful: num(x.like_count || x.helpful_votes) || 0,
    verified: Boolean(x.is_buyer || x.verified_purchase),
    source: 'nykaa-api',
    _id: String(x.id || `n-${String(text).slice(0, 40)}`),
  };
}

function apiGet(productId, page, pageSize) {
  const qs = new URLSearchParams({
    page: String(page),
    pagesize: String(pageSize),
    sortBy: 'MOST_RECENT',
  }).toString();
  return new Promise((resolve) => {
    const req = require('https').request(
      {
        hostname: 'www.nykaa.com',
        port: 443,
        path: `/gateway-api/products/${productId}/reviews?${qs}`,
        method: 'GET',
        headers: {
          Host: 'www.nykaa.com',
          'User-Agent': config.crawler.userAgent,
          Accept: 'application/json, text/plain, */*',
          'Accept-Language': 'en-IN,en;q=0.9',
          Origin: 'https://www.nykaa.com',
          Referer: `https://www.nykaa.com/`,
          'X-Requested-With': 'XMLHttpRequest',
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
 * Paginate the Nykaa reviews gateway until an empty page. Returns
 * { reviews, blocked } where `blocked` means the API was unreachable/forbidden.
 */
async function fetchViaApi(productId, onSpacing) {
  const all = [];
  const seen = new Set();
  let blockedStrikes = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    let res = await apiGet(productId, page, PER_PAGE);
    if (res.status !== 200) {
      if (res.status === 400 || res.status === 404 || res.status === 401) break; // bad product / auth wall
      blockedStrikes += 1;
      if (blockedStrikes >= 2) return { reviews: all, blocked: true }; // persistent block
      if (onSpacing) onSpacing('Nykaa reviews API is rate-limiting — retrying…');
      await sleep(4000);
      res = await apiGet(productId, page, PER_PAGE);
      if (res.status !== 200) break;
    }

    let json = null;
    try { json = JSON.parse(res.body); } catch { break; }
    let revs = json.response && Array.isArray(json.response) ? json.response : [];
    if (!revs.length && Array.isArray(json.reviews)) revs = json.reviews;
    if (!revs.length && Array.isArray(json.data)) revs = json.data;
    let added = 0;
    for (const item of revs) {
      const r = mapApiReview(item);
      if (!r) continue;
      const key = r._id || String(r.text).slice(0, 120).toLowerCase();
      if (key && !seen.has(key)) { seen.add(key); all.push(r); added += 1; }
    }
    const total = num(json.total || json.count || json.paginationTotal || json.totalCount);
    if (total != null && all.length >= total) break;
    if (added === 0 || revs.length === 0) break;
    if (onSpacing) onSpacing(`Reading Nykaa reviews (${all.length} so far)`);
    await sleep(PAGE_GAP_MS);
  }
  return { reviews: all, blocked: blockedStrikes >= 2 };
}

/**
 * Fetch review comments for a Nykaa product. Returns an array of canonical
 * reviews (API slate when reachable, else JSON-LD/DOM embedded copy), or null.
 */
async function fetchNykaaReviews({ productId, html = '', max = 0, onSpacing } = {}) {
  if (!productId) return null;
  const embedded = reviewsFromJsonLd(html);
  let origin = embedded;
  try {
    const api = await fetchViaApi(productId, onSpacing);
    origin = api.reviews && api.reviews.length ? api.reviews : embedded;
    if (!origin.length) origin = embedded;
  } catch {
    origin = embedded;
  }
  const keepAll = config.crawler.nykaaReviews === 0;
  if (!keepAll && max > 0 && origin.length > max) origin = origin.slice(0, max);
  return origin && origin.length ? origin : null;
}

module.exports = { fetchNykaaReviews, extractNykaaProductId, reviewsFromJsonLd };