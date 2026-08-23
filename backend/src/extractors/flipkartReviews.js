/*
 * Flipkart deep review fetcher — pulls the FULL review comment slate from
 * Flipkart's product-reviews JSON API, which the product page shell does not
 * server-render (reviews lazy-load client-side in the RN/Atlas webview).
 *
 * Main source (verified working):
 *   GET https://www.flipkart.com/api/3/product/reviews
 *       ?productId=<PID>&count=30&ratings=ALL&reviewerType=ALL
 *       &sortOrder=MOST_HELPFUL&start=<offset>
 *   -> {"RESPONSE":{ "data":[ { "value": { id, author, rating, title, text,
 *        created, helpfulCount, certifiedBuyer, ... } } ],
 *        "params":{ "totalCount": N } }}
 *
 * The endpoint rate-limits aggressively (403 reCAPTCHA after a burst), so calls
 * are spaced and summary-497d retried once. When the API is persistently blocked
 * we fall back to the server-rendered reviews page (`/product-reviews/<slug>`,
 * embedded 10-per-page in window.__INITIAL_STATE__). If everything is blocked we
 * return null and the caller keeps whatever was embedded in the product page.
 */

const config = require('../config');

const PER_PAGE = 30;
const DEFAULT_SPACING_MS = parseInt(process.env.FLIPKART_SPACING_MS, 10) || 1000;
// Minimum gap between Flipkart review API calls across the whole process.
const GLOBAL_GAP_MS = DEFAULT_SPACING_MS;
const MAX_PAGES = 2;

let lastFlipkartRequestAt = 0;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/*
 * Cross-instance pacing for Flipkart. Flipkart rate-limits bursts with 403
 * ("reCAPTCHA") walls that collapse the review slate to the ~10 fallback copy
 * — the counter that keeps us under it must be shared across ALL worker
 * instances (a per-process counter only works on one box). When REDIS_URL is
 * present the last-request timestamp is also written to Redis so different
 * instances stand in line instead of firing within the same 4s window. Without
 * Redis (local dev) the local counter is used.
 */
let paceRedis = null;
function acquirePaceRedis() {
  if (!process.env.REDIS_URL || paceRedis) return paceRedis;
  try {
    const { Redis } = require('ioredis');
    paceRedis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      enableOfflineQueue: false,
    });
    paceRedis.on('error', () => { /* pacing is best-effort — never break a request */ });
  } catch {
    paceRedis = null;
  }
  return paceRedis;
}

const PACE_KEY = 'flipkart:request:last';

async function waitForPace(gapMs) {
  const redis = acquirePaceRedis();
  let remoteLast = 0;
  if (redis) {
    const cur = await redis.get(PACE_KEY).catch(() => null);
    remoteLast = parseInt(cur, 10) || 0;
  }
  const last = Math.max(lastFlipkartRequestAt, remoteLast);
  const wait = gapMs - (Date.now() - last);
  if (wait > 0) await sleep(wait);
  const stamped = Date.now();
  lastFlipkartRequestAt = stamped;
  if (redis) redis.set(PACE_KEY, String(stamped), 'EX', 60).catch(() => {});
}

/**
 * Serialize every outbound Flipkart request with a global minimum gap. Two
 * analyze requests running close together must still be spaced apart — the
 * 403 ("reCAPTCHA") wall is what reduces review counts to the ~10 fallback.
 */
async function paced(fn, gapMs = GLOBAL_GAP_MS) {
  await waitForPace(gapMs);
  return fn();
}

/**
 * Expose the shared pace-gate so the caller can also space out the Flipkart
 * product-page fetch (one analyze request) against the reviews API calls of a
 * second analyze request running right behind it. Without this, pasting two
 * product links in a row produces a burst that trips the anti-bot wall.
 */
function acquireFlipkartSlot(gapMs = GLOBAL_GAP_MS) {
  return waitForPace(gapMs);
}

function num(v) {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function extractProductId(url, html = '') {
  if (url) {
    try {
      const pid = new URL(url).searchParams.get('pid');
      if (pid) return pid;
    } catch { /* ignore */ }
  }
  const fromHtml = String(html || '').match(/[?&]pid=([A-Za-z0-9]{8,})/);
  if (fromHtml) return fromHtml[1];
  // Fallback: the page's embedded widget state carries the ATLAS productId
  // ("MOBHP2QY7GH4XWWS") even when the URL has no pid param.
  const atlas = String(html || '').match(/"productId"\s*:\s*"([A-Za-z0-9]{8,})"/);
  return atlas ? atlas[1] : null;
}

/** Build a plausible reviews-page referer + page URL from the product URL. */
function reviewsPageUrl(url, pid) {
  try {
    const u = new URL(url);
    const segments = u.pathname.split('/').filter(Boolean);
    const slug = segments[0] && segments[0] !== 'p' ? segments[0] : null;
    if (slug) {
      return `https://www.flipkart.com/${slug}/product-reviews/${slug}?pid=${pid}`;
    }
    return `https://www.flipkart.com/p/${pid}/product-reviews/${pid}?pid=${pid}`;
  } catch { /* ignore */ }
  return `https://www.flipkart.com/p/${pid}?pid=${pid}`;
}

function mapReview(value) {
  if (!value) return null;
  const hasText = Boolean(value.text && String(value.text).trim().length > 0);
  const hasRating = value.rating != null && !Number.isNaN(num(value.rating));
  if (!hasText && !hasRating) return null;
  return {
    author: value.author || null,
    rating: num(value.rating),
    title: value.title || null,
    text: String(value.text || '').slice(0, 4000),
    date: value.created || value.date || null,
    helpful: num(value.helpfulCount || (value.upvote && value.upvote.value && value.upvote.value.count)) || 0,
    verified: Boolean(value.certifiedBuyer || value.verified),
    source: 'flipkart-api',
    _id: value.id || value.reviewId || null,
  };
}

function pushUnique(all, seen, r) {
  if (!r) return false;
  const key = r._id || String(r.text || '').slice(0, 120).toLowerCase();
  if (!key || seen.has(key)) return false;
  seen.add(key);
  all.push(r);
  return true;
}

function apiGet(productId, start, referer) {
  return new Promise((resolve) => {
    const params = {
      productId,
      count: String(PER_PAGE),
      ratings: 'ALL',
      reviewerType: 'ALL',
      sortOrder: 'MOST_HELPFUL',
      start: String(start),
    };
    const qs = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    const req = require('https').request(
      {
        hostname: 'www.flipkart.com',
        port: 443,
        path: `/api/3/product/reviews?${qs}`,
        method: 'GET',
        headers: {
          Host: 'www.flipkart.com',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 FKUA/website/41/website/Desktop',
          Accept: 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          Origin: 'https://www.flipkart.com',
          Referer: referer,
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
        },
        timeout: 8000,
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

/** Server-rendered reviews page → embedded ProductReviewValue objects. */
function reviewsFromReviewsPageHtml(html) {
  const out = [];
  if (!html || typeof html !== 'string') return out;
  const tryPush = (raw) => {
    const r = mapReview(raw);
    if (r) {
      r.source = 'flipkart-page';
      out.push(r);
    }
  };
  // Strategy 1: the classic window.__INITIAL_STATE__ walk
  try {
    const start = html.indexOf('window.__INITIAL_STATE__ = ');
    if (start !== -1) {
      let depth = 0, end = -1;
      for (let i = start + 'window.__INITIAL_STATE__ = '.length; i < html.length; i++) {
        const c = html[i];
        if (c === '{') depth++;
        else if (c === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
      }
      if (end !== -1) {
        const state = JSON.parse(html.slice(start + 'window.__INITIAL_STATE__ = '.length, end));
        (function walk(node, d) {
          if (!node || typeof node !== 'object' || d > 16) return;
          if (Array.isArray(node)) { for (const it of node) walk(it, d + 1); return; }
          const t = node.type || node.__typename;
          const looksLikeReview =
            (t && String(t).toLowerCase().includes('review') && ((node.text != null) || (node.rating != null))) ||
            (node.id && (node.rating != null || (node.text && String(node.text).length > 20)));
          if (looksLikeReview) { tryPush(node); return; }
          for (const k of Object.keys(node)) walk(node[k], d + 1);
        })(state, 0);
      }
    }
  } catch { /* ignore */ }
  // Strategy 2: __NEXT_DATA__ / other Next embeds
  if (out.length < 5) {
    const patterns = [
      /<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i,
      /window\.__NEXT_DATA__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/i,
      /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/gi,
    ];
    for (const re of patterns) {
      let m;
      while ((m = re.exec(html)) !== null) {
        try {
          const data = JSON.parse(m[1]);
          (function walk(node, d) {
            if (!node || typeof node !== 'object' || d > 16) return;
            if (Array.isArray(node)) { for (const it of node) walk(it, d + 1); return; }
            if ((node.text != null || node.rating != null) && (node.author != null || node.title != null || node.id != null)) {
              tryPush(node); return;
            }
            for (const k of Object.keys(node)) walk(node[k], d + 1);
          })(data, 0);
        } catch { /* ignore */ }
        if (out.length >= 10) break;
      }
      if (out.length >= 10) break;
    }
  }
  return out.filter(Boolean);
}

/**
 * Try multiple response shapes that Flipkart has served over time:
 *   v1 (classic):  json.RESPONSE.data[] -> each item has { value: {...review} }
 *   v2 (flatter):  json.RESPONSE.data[] -> items ARE the review (no .value)
 *   v3 (new key):  json.data[] directly
 *   v4 (nested):   json.RESPONSE.value.data or json.result.items etc.
 * Returns { items[], total } where items are already flattened review objects.
 */
function extractReviewArray(json) {
  let arr = null;
  let total = null;
  if (!json || typeof json !== 'object') return { items: [], total: null };

  const tryTotalFrom = (node) => {
    if (!node || typeof node !== 'object') return;
    const params = node.params || node.paging || node.meta || {};
    const t = num(params.totalCount) ?? num(params.total) ?? num(node.totalCount) ?? num(node.total);
    if (t != null && total == null) total = t;
  };

  const candidates = [
    () => { const r = json.RESPONSE; tryTotalFrom(r); return r && Array.isArray(r.data) ? r.data : null; },
    () => { tryTotalFrom(json); return Array.isArray(json.data) ? json.data : null; },
    () => { const r = json.reviews || json.reviewList || json.result; tryTotalFrom(r); return Array.isArray(r) ? r : null; },
    () => { const r = json.RESPONSE; if (r && r.value && Array.isArray(r.value.data)) { tryTotalFrom(r.value); return r.value.data; } return null; },
    () => { const r = json.data; if (r && Array.isArray(r.reviews)) { tryTotalFrom(r); return r.reviews; } return null; },
  ];

  for (const fn of candidates) {
    try {
      const v = fn();
      if (v && v.length) { arr = v; break; }
    } catch { /* ignore */ }
  }

  if (arr && !arr.length) arr = null;
  return { items: arr || [], total };
}

/**
 * Try the full paginated API. Returns the collected reviews plus a `blocked`
 * flag when the API is persistently unavailable.
 */
async function fetchViaApi({ productId, url, max, spacingMs, onSpacing }) {
  const referer = reviewsPageUrl(url, productId);
  const all = [];
  const seen = new Set();
  let start = 0;
  let totalCount = null;
  let emptyPages = 0;
  let blockedCount = 0;
  const reviewFetchStart = Date.now();
  const REVIEW_FETCH_TIMEOUT_MS = 8000;

  for (let page = 0; page < MAX_PAGES; page++) {
    if (Date.now() - reviewFetchStart > REVIEW_FETCH_TIMEOUT_MS) break;
    if (page > 0 && spacingMs > 0) await sleep(spacingMs);
    let res = await apiGet(productId, start, referer);
    if (res.status !== 200) {
      if (res.status === 400 || res.status === 404 || res.status === 410) {
        return { reviews: all, blocked: false };
      }
      // 403/429/timeout — retry briefly then fall back. A block is usually
      // 15-60s and holding a worker for 2+ minutes kills throughput, so we
      // only retry a couple of times with small backoffs before bailing to
      // the HTML page copy.
      blockedCount += 1;
      const backoffMs = Math.min(1000 * Math.pow(2, blockedCount - 1), 4000);
      if (onSpacing) onSpacing(`Flipkart is rate-limiting the reviews API — backing off ${Math.round(backoffMs / 1000)}s and retrying…`);
      await sleep(backoffMs);
      const retried = await apiGet(productId, start, referer);
      if (retried.status === 200) {
        res = retried;
        blockedCount = Math.max(0, blockedCount - 1);
        if (onSpacing) onSpacing('Flipkart reviews API recovered.');
      } else if (blockedCount >= 3) {
        return { reviews: all, blocked: true };
      } else {
        continue;
      }
    } else {
      blockedCount = 0;
    }

    let json = null;
    try { json = JSON.parse(res.body); } catch { console.log(`[flipkart-reviews] page=${page} status=${res.status} body_prefix=${(res.body || '').slice(0, 200)}`); return { reviews: all, blocked: false }; }
    const { items, total } = extractReviewArray(json);
    if (total != null) totalCount = total;
    console.log(`[flipkart-reviews] page=${page} status=${res.status} items=${items.length} total=${total} collected=${all.length} body_keys=${Object.keys(json || {}).join(',')}`);

    let added = 0;
    for (const it of items) {
      // Accept either the old { value: reviewObj } or a direct review object.
      const reviewRaw = (it && typeof it.value === 'object' && it.value != null) ? it.value : it;
      if (pushUnique(all, seen, mapReview(reviewRaw))) added += 1;
    }
    if (added === 0) {
      emptyPages += 1;
      if (emptyPages >= 2) break;
    } else {
      emptyPages = 0;
    }

    if (max > 0 && all.length >= max) { if (all.length > max) all.length = max; break; }
    if (totalCount != null && all.length >= totalCount) break;
    if (items.length < PER_PAGE) break;

    start += PER_PAGE;
  }
  return { reviews: all, blocked: false };
}

async function fetchViaHtml(productId, url, max) {
  const pageUrl = reviewsPageUrl(url, productId);
  // 1) Plain HTTP (paced, cheap).
  const html = await httpGetBody(pageUrl);
  let revs = html ? reviewsFromReviewsPageHtml(html) : [];
  console.log(`[flipkart-html] url=${pageUrl} html_len=${(html || '').length} reviews_from_html=${revs.length} has_initial_state=${(html || '').includes('__INITIAL_STATE__')} has_next_data=${(html || '').includes('__NEXT_DATA__')}`);
  if (revs.length < 10) {
    // 2) If plain HTTP yielded less than a full SSR page (bot wall), try a
    //    Playwright render.
    try {
      if (config.crawler.playwrightEnabled !== false) {
        const { renderPage } = require('./renderFetcher');
        const rendered = await renderPage(pageUrl, {
          renderWait: 'div[class*="review"], ul[class*="review"], div._1AtVbE',
          retries: 1,
          retryDelayMs: 2000,
        });
        if (rendered && rendered.ok && rendered.html) {
          const r2 = reviewsFromReviewsPageHtml(rendered.html);
          // Merge, preferring rendered results.
          const seen = new Set();
          const merged = [];
          for (const r of [...r2, ...revs]) {
            const k = r._id || String(r.text || '').slice(0, 120).toLowerCase();
            if (k && !seen.has(k)) { seen.add(k); merged.push(r); }
          }
          revs = merged;
        }
      }
    } catch { /* render unavailable — keep the plain-http copy */ }
  }
  if (max > 0 && revs.length > max) revs = revs.slice(0, max);
  return revs.length ? revs : null;
}

function httpGetBody(url) {
  return paced(() => new Promise((resolve) => {
    const u = new URL(url);
    const req = require('https').request(
      {
        hostname: u.hostname,
        port: 443,
        path: u.pathname + u.search,
        method: 'GET',
        headers: {
          Host: u.hostname,
          'User-Agent': config.crawler.userAgent,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 8000,
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (c) => { body += c; if (body.length > 12 * 1024 * 1024) req.destroy(); });
        res.on('end', () => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const loc = res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).toString();
            return httpGetBody(loc).then(resolve);
          }
          resolve(body);
        });
        res.on('error', () => resolve(''));
      }
    );
    req.on('error', () => resolve(''));
    req.on('timeout', () => { req.destroy(); resolve(''); });
    req.end();
  }));
}

/**
 * Fetch review comments for a Flipkart product. `max` = 0 → fetch all.
 * Returns an array of canonical reviews, or null if every source is blocked.
 */
async function fetchFlipkartReviews({ productId, url = '', max = 0, spacingMs = DEFAULT_SPACING_MS, onSpacing } = {}) {
  if (!productId) return null;

  const viaApi = await fetchViaApi({ productId, url, max, spacingMs, onSpacing });
  console.log(`[flipkart-reviews] api result: ${viaApi.reviews.length} reviews, blocked=${viaApi.blocked}`);
  if (viaApi.reviews && viaApi.reviews.length) {
    return viaApi.reviews;
  }
  // Either explicitly blocked, or the API returned 200 but nothing parseable
  if (viaApi.blocked || !viaApi.reviews || viaApi.reviews.length === 0) {
    if (onSpacing) onSpacing('Flipkart reviews API empty — falling back to the page copy…');
    const htmlFallback = await fetchViaHtml(productId, url, max);
    console.log(`[flipkart-reviews] html fallback result: ${htmlFallback ? htmlFallback.length : 0} reviews`);
    if (htmlFallback && htmlFallback.length) return htmlFallback;
    return null;
  }
  return null;
}

module.exports = { fetchFlipkartReviews, extractProductId, fetchViaHtml, reviewsPageUrl, reviewsFromReviewsPageHtml, acquireFlipkartSlot, DEFAULT_SPACING_MS };