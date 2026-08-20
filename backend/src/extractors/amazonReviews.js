/*
 * Amazon.in deep review fetcher.
 *
 * Amazon server-renders the first page of customer reviews inside the product
 * page as `[data-hook="review"]` cards. The standalone `/product-reviews/<asin>`
 * pages hold the whole slate but redirect to a signin wall from datacenter IPs
 * (verified live: 302 -> /ap/signin from this server). Strategy:
 *
 *   1. Extract the ASIN from the product URL.
 *   2. If the caller's product-page HTML already contains `[data-hook="review"]`
 *      cards, parse those (no extra request needed).
 *   3. When the ASIN fetch is set to ALL and RAPIDAPI_KEY is configured, fetch
 *      the full slate via the RapidAPI `product-reviews` endpoint (the free
 *      /product-reviews pages are auth-walled from datacenter IPs).
 *   4. Otherwise best-effort fetch the `/product-reviews/<asin>` page and parse
 *      the same cards, paginating while the "next page" link is present.
 *   5. Any signin-wall / block gracefully falls back to the embedded cards.
 *
 * All reviews are tagged `source: 'amazon-page'` (product page), `amazon-api'
 * (RapidAPI) or 'amazon-api' (dedicated reviews page). Verified live: iPhone 15
 * desktop product page yields ~10 written comments with author / rating / title
 * / date / verified flags.
 */

const config = require('../config');

const MAX_PAGES = 20;
const PAGE_GAP_MS = 1200;

const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'real-time-amazon-data.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function num(v) {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** ASIN = 10-char [A-Z0-9] segment (in /dp/<ASIN> or /gp/product/<ASIN>). */
function extractAsin(url) {
  try {
    const u = new URL(url);
    let m = u.pathname.match(/\/(dp|gp\/product|product)\/([A-Z0-9]{10})/i);
    if (m) return m[2].toUpperCase();
    m = u.pathname.match(/\/([A-Z0-9]{10})\b/);
    if (m) return m[1].toUpperCase();
    if (u.searchParams.get('asin')) return u.searchParams.get('asin').toUpperCase();
  } catch { /* ignore */ }
  return null;
}

/** 10-char ASIN inside any string/href (used for pagination links). */
function asinIn(str) {
  const m = String(str || '').match(/[A-Z0-9]{10}/);
  return m ? m[0] : null;
}

/** Parse the `[data-hook="review"]` cards of an Amazon HTML document. */
function reviewsFromAmazonHtml(html, source = 'amazon-page') {
  const cheerio = require('cheerio');
  const $ = cheerio.load(String(html || ''));
  const out = [];
  $('[data-hook="review"]').each((_, el) => {
    const card = $(el);
    const text = card.find('[data-hook="reviewText"]').first();
    let comment = text.length ? text.text() : '';
    if (!comment) {
      const body = card.find('[data-hook="review-body"]').first();
      comment = body.length ? body.text() : '';
    }
    if (text.length) {
      // pull only the real body, dropping the hidden teaser scaffolding
      const rich = text.find('.a-cardui-content, [data-hook="reviewRichContentContainer"]').first();
      if (rich.length) comment = rich.text() || comment;
    }
    comment = String(comment || '')
      .replace(/^[\s★☆⭐]+/g, '')
      .replace(/\b(Read more|Read less)\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    let rating = null;
    const star = card.find('[data-hook="review-star-rating"] .a-icon-alt, [data-hook="review-star-rating"]').first();
    if (star.length) {
      const om = star.text().match(/(\d+(?:\.\d+)?)\s*out of\s*5/i);
      const an = star.attr('aria-label');
      const src = om && om[1];
      rating = src != null ? Math.min(parseFloat(src), 5) : num(an || star.text());
    }
    if (rating == null) {
      const cls = card.attr('class') || '';
      const cm = cls.match(/a-star-(\d)/);
      if (cm) rating = parseInt(cm[1], 10);
    }
    const title = card.find('[data-hook="reviewTitle"], [data-hook="review-title"]').first().text().trim() || null;
    let author = null;
    const profile = card.find('.a-profile-name').first();
    if (profile.length) author = profile.text().trim() || null;
    if (!author) {
      const auth = card.find('[data-hook="review-author"]').first();
      if (auth.length) author = auth.text().trim() || null;
    }
    let date = null;
    const dEl = card.find('[data-hook="review-date"]').first();
    if (dEl.length) date = dEl.text().replace(/^(reviewed on|reviewed in|reviewed)\s*/i, '').trim() || null;
    const verified = Boolean(card.find('[data-hook="avp-badge"], [data-hook="review-badges"] .a-color-state').length);
    let helpful = 0;
    const hEl = card.find('[data-hook="helpful-vote-stripe"]').first();
    if (hEl.length) {
      const hm = hEl.text().match(/([\d,]+)\s*people? found this helpful/i);
      if (hm) helpful = parseInt(hm[1].replace(/,/g, ''), 10);
    }
    if (!comment && rating == null) return;
    out.push({
      author,
      rating,
      title,
      text: comment.slice(0, 4000),
      date,
      helpful,
      verified,
      source,
      _id: card.attr('data-reviewid') || `amz-${asinIn(card.attr('class')) || ''}-${String(comment).slice(0, 20)}`,
    });
  });
  // dedupe by text key
  const seen = new Set();
  const deduped = [];
  for (const r of out) {
    const key = String(r.text || r.title || '').slice(0, 120).toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(r);
  }
  return deduped;
}

function httpGet(url, extra = {}) {
  return new Promise((resolve) => {
    const https = require('https');
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: {
        Host: u.hostname,
        'User-Agent': config.crawler.userAgent,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-IN,en-US;q=0.9,en;q=0.8',
        'Upgrade-Insecure-Requests': '1',
        Referer: 'https://www.amazon.in/',
        ...extra.headers,
      },
      timeout: 25000,
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, loc: res.headers.location || null, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', (e) => resolve({ status: 0, loc: null, body: '', error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, loc: null, body: '', error: 'timeout' }); });
    req.end();
  });
}

/** Follow redirects (Amazon uses 302 chains for desktop users). */
async function httpGetFollow(url, hops = 0) {
  const r = await httpGet(url);
  if (r.loc && hops < 5) {
    const next = r.loc.startsWith('http') ? r.loc : `https://www.amazon.in${r.loc}`;
    return httpGetFollow(next, hops + 1);
  }
  return r;
}

/**
 * Fetch the reviews-page and parse the next "page". Amazon's customer-reviews
 * pages embed the whole current page of review cards. Returns the card count.
 */
async function fetchReviewsPage(asin, page, onSpacing) {
  const url = `https://www.amazon.in/product-reviews/${asin}/ref=cm_cr_getr_d_paging_btm_next_${page}?ie=UTF8&reviewerType=all_reviews&pageNumber=${page}&sortBy=recent`;
  const r = await httpGetFollow(url);
  if (r.status === 200 && r.body && r.body.length > 5000) {
    const cards = reviewsFromAmazonHtml(r.body, 'amazon-api');
    if (cards && cards.length) {
      if (onSpacing) onSpacing(`Reading Amazon reviews (${page} page so far)`);
      return { cards, next: /\bpaging_btm_next\b/.test(r.body) };
    }
  }
  return { cards: [], next: false };
}

/**
 * Full Amazon review slate via the RapidAPI `product-reviews` endpoint. Only
 * reachable when RAPIDAPI_KEY is configured (the server IP is bot-wall gated on
 * the free /product-reviews pages). Paginates every page until empty.
 *
 * Maps each item into the canonical review shape with `source: 'amazon-api'`.
 */
async function fetchAmazonReviewsViaApi(asin, { max = 0, onSpacing } = {}) {
  if (!RAPIDAPI_KEY || !asin) return null;
  const country = 'IN';
  const reviews = [];
  let page = 1;
  const keepAll = config.crawler.amazonReviews === 0;
  try {
    for (; page <= 25; page++) {
      const url = new URL(`https://${RAPIDAPI_HOST}/product-reviews`);
      url.searchParams.set('asin', asin);
      url.searchParams.set('country', country);
      url.searchParams.set('page', String(page));
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      let json;
      try {
        const res = await fetch(url, {
          headers: {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_HOST,
          },
          signal: controller.signal,
        });
        if (!res.ok) {
          const body = await res.text();
          if (res.status === 401 || res.status === 403) throw new Error(`RapidAPI auth HTTP ${res.status}: ${body.slice(0, 120)}`);
          if (page === 1) throw new Error(`RapidAPI HTTP ${res.status}: ${body.slice(0, 120)}`);
          break;
        }
        json = await res.json();
      } finally {
        clearTimeout(timer);
      }
      const data = json && json.data;
      const items = Array.isArray(data && data.reviews)
        ? data.reviews
        : (Array.isArray(json && json.reviews) ? json.reviews : null);
      if (!items || !items.length) break;
      for (const it of items) {
        if (!it || !(it.review_body || it.comment || it.review_summary || it.review_title)) continue;
        reviews.push({
          _id: it.id || it.review_id || null,
          author: it.reviewer_name || it.author || 'Amazon Customer',
          rating: num(it.review_rating != null ? it.review_rating : it.rating),
          title: it.review_title || it.review_summary || null,
          text: it.review_body || it.comment || it.review_summary || '',
          date: it.review_date || it.date || null,
          verified: Boolean(it.is_verified),
          helpful: num(it.helpful_votes != null ? it.helpful_votes : it.helpful),
          source: 'amazon-api',
        });
      }
      if (onSpacing) onSpacing(`Amazon reviews fetched (${reviews.length} so far)`);
      await sleep(700);
    }
  } catch {
    // API failed mid-fetch — keep whatever was collected, if any.
  }
  if (!keepAll && max > 0 && reviews.length > max) reviews.length = max;
  return reviews && reviews.length ? reviews : null;
}

/**
 * Fetch review comments for an Amazon product. Returns an array of canonical
 * reviews, or null if the ASIN is missing / nothing was parseable.
 *
 * `html` is the already-fetched product page (may already contain the embedded
 * first-page cards); the deep `/product-reviews/` page is only attempted when
 * reachable and gracefully skipped when it hits the auth wall.
 */
async function fetchAmazonReviews({ asin, url = '', html = '', max = 0, onSpacing } = {}) {
  if (!asin) {
    asin = extractAsin(url);
  }
  if (!asin) return null;
  if (!html) {
    html = '';
  }

  const keepAll = config.crawler.amazonReviews === 0;
  const wantMany = (max <= 0 || max > 12);

  // With a RapidAPI key we can get the full slate (deep pages are auth-walled).
  if (keepAll && wantMany && RAPIDAPI_KEY) {
    const viaApi = await fetchAmazonReviewsViaApi(asin, { max, onSpacing });
    if (viaApi && viaApi.length) return viaApi;
  }

  const embedded = reviewsFromAmazonHtml(html, 'amazon-page');
  let reviews = embedded;

  // Only reach for the full slate when we have a browser-ish network AND the
  // page didn't already give us everything we need.
  const needDeep = (max <= 0 || reviews.length < max) && reviews.length < 40;
  if (needDeep) {
    try {
      for (let page = 1; page <= MAX_PAGES; page++) {
        const { cards, next } = await fetchReviewsPage(asin, page, onSpacing);
        if (!cards || !cards.length) break;
        reviews = [...reviews, ...cards];
        if (!next) break;
        await sleep(PAGE_GAP_MS);
      }
    } catch {
      /* deep page was blocked — embedded cards are enough */
    }
    if (onSpacing && reviews.length > embedded.length) {
      onSpacing(`Amazon reviews fetched (${reviews.length} so far)`);
    }
  }

  if (!keepAll && max > 0 && reviews.length > max) reviews = reviews.slice(0, max);
  return reviews && reviews.length ? reviews : null;
}

module.exports = { fetchAmazonReviews, fetchAmazonReviewsViaApi, extractAsin, reviewsFromAmazonHtml };