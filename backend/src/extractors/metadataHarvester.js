/*
 * Metadata harvester — the structured-data backbone.
 *
 * Reads JSON-LD (schema.org Product/Offer/AggregateRating/Review), Open Graph,
 * Twitter Card, standard <meta> tags, and microdata-driven itemprop attributes.
 * Structured data is the most reliable signal and is preferred over DOM text.
 */

const cheerio = require('cheerio');

function asArray(v) {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function pickFirst(items) {
  for (const item of asArray(items)) {
    if (item == null) continue;
    const text = typeof item === 'string' ? item : item.name || item.title || item.text || '';
    if (String(text).trim()) return String(text).trim();
  }
  return null;
}

function num(v) {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function jsonldOf($) {
  const out = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).text();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      out.push(...asArray(parsed));
    } catch { /* skip malformed blobs */ }
  });
  // Follow @graph wrappers and pick Product-like nodes
  const products = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    const type = node['@type'];
    const types = Array.isArray(type) ? type : [type];
    if (types.includes('Product')) products.push(node);
    if (node['@graph']) asArray(node['@graph']).forEach(walk);
    if (node.itemListElement) asArray(node.itemListElement).forEach(walk);
  };
  out.forEach(walk);
  // A single flat Product node not nested
  return products.length ? products : out.filter((n) => n && typeof n === 'object' && String(n['@type'] || '').includes('Product'));
}

function fromJsonLd(products) {
  if (!products || products.length === 0) return {};
  const p = products.find((x) => x) || {};
  const offers = asArray(p.offers || (p.offers && [p.offers]));
  const offer = offers.find((o) => o) || {};
  const agg = p.aggregateRating || {};
  const brand = p.brand && (p.brand.name || p.brand) ? (typeof p.brand === 'object' ? p.brand.name : p.brand) : null;

  const currency = offer.priceCurrency || offer.pricecurrency || null;
  let price = num(offer.price) != null ? num(offer.price) : num(p.price);
  const salePrice = num(offer.lowPrice) != null ? num(offer.lowPrice) : null;
  const highPrice = num(offer.highPrice) != null ? num(offer.highPrice) : null;
  const listPrice = (offer.priceSpecification && num(offer.priceSpecification.price)) || null;

  const imageNode = p.image || (p.image && p.image[0]);
  const images = asArray(typeof imageNode === 'object' ? imageNode : p.image).map((i) => (typeof i === 'object' ? i.url || i.contentUrl : i)).filter(Boolean);
  const mainImage = images[0] || null;

  return {
    title: p.name || null,
    brand,
    description: (p.description || '').trim() || null,
    price,
    originalPrice: listPrice || highPrice || null,
    currency,
    image: mainImage,
    images,
    sku: p.sku || p.mpn || null,
    mpn: p.mpn || null,
    model: p.model || null,
    category: p.category || null,
    url: p.url || null,
    availability: offer.availability ? String(offer.availability).split('/').pop() : null,
    availabilityStaged: offer.availability ? String(offer.availability) : null,
    ratingValue: num(agg.ratingValue) != null ? num(agg.ratingValue) : null,
    ratingCount: num(agg.ratingCount) != null ? num(agg.ratingCount) : (num(agg.reviewCount) != null ? num(agg.reviewCount) : null),
    reviewCount: num(agg.reviewCount) != null ? num(agg.reviewCount) : null,
    reviews: asArray(p.review).map((r) => ({
      author: r.author && (r.author.name || r.author) ? (typeof r.author === 'object' ? r.author.name : r.author) : null,
      rating: r.reviewRating ? num(r.reviewRating.ratingValue) : null,
      title: r.name || null,
      text: r.reviewBody || null,
      date: r.datePublished || null,
      bestRating: r.reviewRating ? num(r.reviewRating.bestRating) : null,
      verified: null,
    })).filter((r) => r.text || r.rating != null),
    brand_from_meta: brand,
  };
}

function og($) {
  const meta = (key) => $(`meta[property="${key}"], meta[name="${key}"], meta[itemprop="${key}"]`).attr('content') || null;
  return {
    title: meta('og:title') || meta('twitter:title') || null,
    description: meta('og:description') || meta('twitter:description') || meta('description') || null,
    image: meta('og:image') || meta('twitter:image') || null,
    url: meta('og:url') || null,
    siteName: meta('og:site_name') || null,
    type: meta('og:type') || null,
  };
}

function microdata($) {
  const txt = (sel) => $(sel).first().text().trim() || null;
  const attr = (sel, key) => $(sel).first().attr(key) || null;
  return {
    title: txt('[itemprop="name"]') || null,
    brand: txt('[itemprop="brand"] [itemprop="name"]') || attr('[itemprop="brand"] [itemprop="name"]', 'content') || null,
    price: num(attr('[itemprop="price"]', 'content')) != null ? num(attr('[itemprop="price"]', 'content')) : num(txt('[itemprop="price"]')),
    currency: attr('[itemprop="priceCurrency"]', 'content') || null,
    ratingValue: num(attr('[itemprop="ratingValue"]', 'content')) != null ? num(attr('[itemprop="ratingValue"]', 'content')) : num(txt('[itemprop="ratingValue"]')),
    ratingCount: num(attr('[itemprop="reviewCount"]', 'content')) != null ? num(attr('[itemprop="reviewCount"]', 'content')) : num(txt('[itemprop="reviewCount"]')),
    description: attr('[itemprop="description"]', 'content') || txt('[itemprop="description"]') || null,
    image: attr('[itemprop="image"]', 'content') || attr('[itemprop="image"]', 'src') || null,
    sku: attr('[itemprop="sku"]', 'content') || txt('[itemprop="sku"]') || null,
    availability: attr('[itemprop="availability"]', 'href') || null,
    brand2: null,
  };
}

function canonical($) {
  return $('link[rel="canonical"]').attr('href') || null;
}

function harvest($, baseUrl) {
  const resolved = (u) => {
    if (!u) return null;
    try { return new URL(u, baseUrl).href; } catch { return u; }
  };
  const ld = fromJsonLd(jsonldOf($));
  const ogData = og($);
  const micro = microdata($);

  const image = ld.image || ogData.image || micro.image || null;
  const images = ld.images && ld.images.length ? ld.images : [image].filter(Boolean);

  return {
    title: ld.title || ogData.title || micro.title || null,
    description: ld.description || ogData.description || micro.description || null,
    brand: ld.brand || micro.brand || null,
    price: ld.price != null ? ld.price : micro.price,
    originalPrice: ld.originalPrice,
    currency: ld.currency || micro.currency || (ld.price != null ? null : null),
    image: resolved(image),
    images: images.map(resolved).filter(Boolean),
    url: resolved(ld.url || ogData.url || canonical($)) || resolved(baseUrl),
    sku: ld.sku || micro.sku || null,
    model: ld.model || null,
    category: ld.category || null,
    availability: ld.availability || null,
    ratingValue: ld.ratingValue != null ? ld.ratingValue : micro.ratingValue,
    ratingCount: ld.ratingCount != null ? ld.ratingCount : micro.ratingCount,
    reviewCount: ld.reviewCount != null ? ld.reviewCount : null,
    reviews: ld.reviews || [],
    siteName: ogData.siteName || null,
    pageType: ogData.type || null,
  };
}

module.exports = { harvest, jsonldOf, fromJsonLd, og, microdata, num, asArray };
