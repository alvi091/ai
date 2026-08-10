/*
 * DOM extractor — uses the site profile's CSS selectors (with generic fallbacks)
 * to read visible HTML signals. Structured metadata (metadataHarvester) is
 * merged upstream and takes precedence; this layer fills the gaps.
 */

const cheerio = require('cheerio');
const { GENERIC } = require('./websiteRegistry');

function num(v) {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function cleanText(str) {
  return String(str || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstMatch($, selectors, { attr = null, maxLen = 5000 } = {}) {
  for (const sel of selectors || []) {
    const nodes = $(sel);
    if (!nodes.length) continue;
    for (let i = 0; i < Math.min(nodes.length, 3); i++) {
      const el = nodes.eq(i);
      let val = attr ? el.attr(attr) || null : el.text();
      if (attr && !val) {
        val = el.find('img').attr('src') || null;
      }
      if (!val) continue;
      if (attr === 'text') val = cleanText(val);
      if (typeof val === 'string' && (val = cleanText(val)) && val.length <= maxLen) return val;
      if (typeof val === 'string' && val.length > 0) return val.slice(0, maxLen);
    }
  }
  return null;
}

function priceFromText(t) {
  if (!t) return null;
  return num(t);
}

function specsFromRows($, selectors, maxRows = 40) {
  const specs = [];
  for (const sel of selectors || []) {
    const rows = $(sel);
    if (!rows.length) continue;
    for (const row of rows) {
      const cells = $(row).find('th, td, dt, dd');
      if (!cells.length) continue;
      const labels = cells.map((_, c) => cleanText($(c).text())).get().filter(Boolean);
      if (labels.length >= 2) {
        const label = labels[0];
        const value = labels.slice(1).join(' / ');
        if (label.length < 2 || label.length > 60 || value.length < 1 || value.length > 400) continue;
        specs.push({ label, value });
      }
    }
    if (specs.length >= maxRows) break;
  }
  return specs;
}

function listFrom($, selectors, max = 25) {
  const out = [];
  for (const sel of selectors || []) {
    const nodes = $(sel);
    if (!nodes.length) continue;
    nodes.each((_, el) => {
      const t = cleanText($(el).text());
      if (t.length < 2 || t.length > 600) return;
      out.push(t);
    });
    if (out.length >= max) break;
  }
  return out.slice(0, max);
}

function extractDom(html, siteSelectors) {
  const $ = cheerio.load(html);
  const sel = { ...GENERIC, ...(siteSelectors || {}) };

  const images = [];
  for (const selName of ['images', 'image']) {
    for (const s of sel[selName] || []) {
      const srcs = $(s).map((_, el) => $(el).attr('src') || $(el).attr('data-src') || $(el).attr('srcset')).get();
      srcs.forEach((src) => {
        if (src && !/^data:/.test(src) && images.indexOf(src) === -1) images.push(src);
      });
    }
    if (images.length >= 12) break;
  }
  if (images.length === 0) {
    const src = firstMatch($, sel.image || [], { attr: 'src' });
    if (src && /^https?:/.test(src)) images.push(src);
  }

  const specs = specsFromRows($, sel.specsTable || sel.specs || []);

  return {
    title: firstMatch($, sel.title),
    brand: firstMatch($, sel.brand),
    price: priceFromMostSpecific($, sel.price || []),
    originalPrice: priceFromMostSpecific($, sel.originalPrice || []),
    currency: null,
    image: images[0] || null,
    images,
    availability: (() => {
      if (sel.outOfStock) {
        const out = $(sel.outOfStock[0]);
        if (out && out.length) return 'Currently unavailable';
      }
      const a = firstMatch($, sel.availability);
      if (a && /unavailable|out of stock|temporarily|not in stock/i.test(a)) return a;
      return a || null;
    })(),
    seller: firstMatch($, sel.seller),
    description: firstMatch($, sel.description, { maxLen: 12000 }),
    features: listFrom($, sel.features),
    specs,
    ratingValue: (() => {
      const v = firstMatch($, sel.ratingValue);
      const parsed = v && num(v && v.split('/')[0]);
      if (parsed != null && parsed <= 5) return parsed;
      const alt = firstMatch($, sel.reviewRating || ['[aria-label*="out of 5"]'], { attr: 'aria-label' });
      if (alt) {
        const m = String(alt).match(/(\d+(?:\.\d+)?)\s*out of/i);
        if (m) return parseFloat(m[1]);
      }
      return null;
    })(),
    ratingCount: (() => {
      const v = firstMatch($, sel.ratingCount);
      const m = v && v.match(/[\d,.]+[kK]?/);
      if (m) return num(m[0].replace(/,/g, ''));
      // aria-label like "4.5 out of 5 stars, 1,263 ratings"
      const alt = $('[aria-label*="out of 5 stars,"]').first().attr('aria-label');
      const cm = alt && alt.match(/([\d,.]+[kK]?)\s*(ratings?|global ratings?)/i);
      if (cm) return num(cm[1].replace(/,/g, ''));
      return null;
    })(),
    starDistribution: (() => {
      const dist = { 5: null, 4: null, 3: null, 2: null, 1: null };
      let any = false;
      $('[aria-label]').each((_, el) => {
        const a = String($(el).attr('aria-label') || '');
        const m = a.match(/([\d.]+)\s*percent of reviews? have\s*(\d+)\s*stars?/i);
        const star = m ? parseInt(m[2], 10) : null;
        if (star != null && Object.prototype.hasOwnProperty.call(dist, star)) {
          dist[star] = parseFloat(m[1]);
          any = true;
        }
      });
      if (!any) return null;
      return {
        '5_best': dist[5], '4_good': dist[4], '3_neutral': dist[3],
        '2_bad': dist[2], '1_very_bad': dist[1],
      };
    })(),
  };
}

function priceFromMostSpecific($, sels) {
  const candidates = [];
  for (const s of sels) {
    const els = $(s);
    for (const el of els) {
      const $el = $(el);
      const val = $el.attr('content') || $el.attr('value') || $el.text();
      if (!val) continue;
      const n = num(val);
      if (n == null || n <= 0) continue;
      candidates.push({ n, inLink: $el.closest('a').length > 0 });
    }
  }
  if (!candidates.length) return null;
  // Prefer a price that is NOT trapped inside an accessory/compare link
  // (Amazon "frequently bought together" carousels carry stray prices).
  const free = candidates.find((c) => !c.inLink);
  return free ? free.n : null;
}

module.exports = { extractDom, cleanText, num, listFrom };