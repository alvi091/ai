/*
 * Deep review scraper — collects a batch of full review comments from a rendered
 * storefront product page, beyond just the count + rating.
 *
 * Uses the shared reused browser from renderFetcher. Pagination is capped so
 * latency and memory stay bounded. If a store blocks review pagination, this
 * gracefully falls back to whatever reviews were already embedded in the page
 * (JSON-LD / __NEXT_DATA__) rather than fabricating content.
 */

const config = require('../config');
const { renderPage } = require('./renderFetcher');
const cheerio = require('cheerio');

const DEFAULT_MAX_REVIEWS = parseInt(config.crawler.maxReviews, 10) || 60;

function num(v) {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function fromDomReviews(html, selectors, max) {
  const $ = cheerio.load(html);
  const out = [];
  const container = (selectors && selectors.reviews) || '[class*="review"]';
  const textSel = (selectors && selectors.reviewText) || '[class*="reviewText"], [class*="review-text"], p';
  const ratingSel = (selectors && selectors.reviewRating) || '[class*="rating"], [aria-label*="out of 5"]';
  const authorSel = (selectors && selectors.reviewAuthor) || '[itemprop="author"], [class*="author"], [class*="name"]';

  $(container).each((_, el) => {
    if (out.length >= max) return false;
    const $el = $(el);
    let text = '';
    $(textSel, $el).each((__, node) => {
      const t = $(node).text().replace(/\s+/g, ' ').trim();
      if (t.length > text.length) text = t;
    });
    if (!text) {
      const direct = $el.text().replace(/\s+/g, ' ').trim();
      if (direct.length > 20) text = direct;
    }
    if (!text) return;
    let rating = null;
    $(ratingSel, $el).each((__, node) => {
      const aria = $(node).attr('aria-label') || '';
      const m = aria.match(/(\d+(?:\.\d+)?)\s*out of/i);
      if (m) { rating = num(m[1]); return false; }
      const n = num($(node).text());
      if (n != null && n <= 5) { rating = n; return false; }
    });
    const author = $(authorSel, $el).first().text().replace(/\s+/g, ' ').trim() || null;
    out.push({ author, rating, text: text.slice(0, 2000) });
  });
  return out;
}

/**
 * Render a product page (optionally reaching a live review region) and return a
 * rich review batch merged with embedded JSON-LD/__NEXT_DATA__ reviews.
 */
async function scrapeReviews(url, { site, embeddedReviews = [], max = DEFAULT_MAX_REVIEWS } = {}) {
  const fetched = await renderPage(url, { renderWait: site.renderWait });
  if (!fetched.ok) {
    // Fall back to whatever was embedded from the structured extractor.
    return (embeddedReviews || []).slice(0, max);
  }

  let domReviews = [];
  try {
    domReviews = fromDomReviews(fetched.html, site.selectors, max);
  } catch { domReviews = []; }

  const merged = [];
  const seen = new Set();
  for (const r of [...(embeddedReviews || []), ...domReviews]) {
    const key = String(r.text || r.comment || '').slice(0, 120).toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(r);
    if (merged.length >= max) break;
  }
  return merged;
}

module.exports = { scrapeReviews, fromDomReviews };
