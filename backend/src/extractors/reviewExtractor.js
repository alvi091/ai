/*
 * Review extractor — pulls buyer reviews from JSON-LD and visible HTML.
 * Downstream cleaning (spam/fake/dedupe/cluster) happens in reviewAnalyzer.
 */

const cheerio = require('cheerio');
const { cleanText, num } = require('./domExtractor');
const { GENERIC } = require('./websiteRegistry');
const config = require('../config');

const TEASER_SELS = [
  '.a-teaser-describedby-collapsed',
  '.a-teaser-describedby-expanded',
  '[class*="teaser-describedby"]',
  '.a-text-normal', // anchor wrapper noise inside some review bodies
];

function parseRating(v) {
  if (v == null) return null;
  const s = String(v);
  const outOf = s.match(/(\d+(?:\.\d+)?)\s*out of\s*(\d+)/i);
  if (outOf) {
    const n = parseFloat(outOf[1]);
    const best = parseInt(outOf[2], 10);
    return Number.isFinite(n) && best ? Math.min(n, best) : null;
  }
  const slash = s.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+)/);
  if (slash) {
    const n = parseFloat(slash[1]);
    const best = parseInt(slash[2], 10);
    return Number.isFinite(n) && best ? Math.min(n, best) : null;
  }
  const n = num(s);
  if (n == null) return null;
  return n > 5 ? null : n;
}

function fromJsonLd(ldReviews, max = 300) {
  const out = [];
  for (const r of ldReviews || []) {
    const text = (r.text || '').trim();
    const rating = r.rating != null ? r.rating : null;
    if (!text && rating == null) continue;
    out.push({
      author: r.author || null,
      rating,
      title: r.title || null,
      text,
      date: r.date || null,
      helpfulVotes: 0,
      verified: r.verified || false,
      source: 'structured',
    });
    if (out.length >= max) break;
  }
  return out;
}

function stripTeasers($, card) {
  card.find(TEASER_SELS.join(',')).remove();
}

function cleanReviewText(t) {
  return String(t || '')
    .replace(/^[\s★☆⭐]+/g, '')
    .replace(/\b(Read more|Read less)\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractReviewFrom($, card, sel) {
  const textSel = sel.reviewText || [];
  let text = '';
  for (const t of textSel) {
    const tEl = card.find(t).first();
    if (tEl.length && cleanText(tEl.text()).length > 20) { text = cleanReviewText(tEl.text()).slice(0, 3000); break; }
  }

  let rating = null;
  for (const r of sel.reviewRating || []) {
    const rEl = card.find(r).first();
    const v = rEl.attr('content') || rEl.attr('aria-label') || rEl.text();
    const n = parseRating(v);
    if (n != null) { rating = n; break; }
  }
  if (rating == null) {
    // aria-label star strings like "5.0 out of 5 stars" or class-based stars
    const alt = card.find('[aria-label*="out of 5"], [class*="a-star-"], [class*="stars"]').first();
    if (alt.length) rating = parseRating(alt.attr('aria-label') || alt.attr('title') || alt.text());
  }

  let title = '';
  for (const t of sel.reviewTitle || []) {
    const tEl = card.find(t).first();
    if (tEl.length) { title = cleanText(tEl.text()); if (title) break; }
  }

  let date = null;
  for (const d of sel.reviewDate || []) {
    const dEl = card.find(d).first();
    if (dEl.length) { date = cleanText(dEl.text().replace(/^(reviewed on|reviewed in|on|reviewed)\s*/i, '')); if (date) break; }
  }

  let verified = false;
  for (const v of sel.reviewVerified || []) {
    if (card.find(v).length) { verified = true; break; }
  }

  let author = null;
  for (const a of sel.reviewAuthor || []) {
    const aEl = card.find(a).first();
    if (aEl.length) { author = cleanText(aEl.text()); if (author) break; }
  }

  if (!text && rating == null) return null;
  return { text, rating: rating || null, title: title || null, date, verified, author, helpful: 0, source: 'dom', sourceUrl: null };
}

function containerSelectors(sel) {
  const merged = { ...GENERIC, ...(sel || {}) };
  const list = [
    ...(merged.reviews || []),
    ...(merged.reviewContainer || []),
    '[data-hook="review"]',
  ];
  const seen = [];
  for (const s of list) {
    if (seen.indexOf(s) === -1) seen.push(s);
  }
  return seen;
}

function bodyFirstSelectors(sel) {
  const merged = { ...GENERIC, ...(sel || {}) };
  const bodies = [
    ...(merged.reviewText || []),
    '[data-hook="reviewText"]',
    '[data-hook="review-body"]',
    '[itemprop="reviewBody"]',
    '[class*="single-review-text-container"]',
  ];
  const seen = [];
  for (const s of bodies) {
    if (seen.indexOf(s) === -1) seen.push(s);
  }
  return seen;
}

function fromDom(html, siteSelectors, max = config.crawler.maxReviews) {
  const $ = cheerio.load(html);
  const sel = { ...GENERIC, ...(siteSelectors || {}) };
  const found = [];

  const containerHit = (card) => {
    stripTeasers($, card);
    const r = extractReviewFrom($, card, sel);
    if (r) found.push(r);
  };

  for (const s of containerSelectors(sel)) {
    $(s).each((_, el) => containerHit($(el)));
    if (found.length >= max) break;
  }

  // Structural fallback: when no container matched, anchor on review-body
  // nodes and climb to a plausible unit.
  if (found.length < max) {
    for (const s of bodyFirstSelectors(sel)) {
      $(s).each((_, el) => {
        if (found.length >= max) return;
        let card = $(el);
        // climb up to 4 levels looking for a container that holds stars/text
        let best = card;
        for (let i = 0; i < 4; i++) {
          const parent = best.parent();
          if (!parent.length) break;
          const cls = (parent.attr('class') || '').toLowerCase();
          if (/review|comment|feedback|card|item|list-item/.test(cls)) { best = parent; }
        }
        stripTeasers($, best);
        const r = extractReviewFrom($, best, sel);
        // structural fallback only accepts units that carry a rating or real prose
        if (r && (r.rating != null || (r.text && r.text.length >= 80))) found.push(r);
      });
      if (found.length >= max) break;
    }
  }

  // de-duplicate by leading text
  const seen = new Set();
  const out = [];
  for (const r of found) {
    const key = String(r.text || r.title || '').slice(0, 120).toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out.slice(0, max);
}

module.exports = { fromJsonLd, fromDom, parseRating };
