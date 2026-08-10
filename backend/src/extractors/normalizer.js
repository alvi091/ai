/*
 * Normalizer — data cleaning & normalization.
 *
 * Merges structured metadata (JSON-LD/OG/microdata) with DOM extraction into a single
 * canonical product model. Cleans prices & currencies, titles, descriptions, images,
 * spec rows, and availability. Tracks provenance + a per-field quality score so
 * downstream engines know how much to trust each signal. Never invents data here —
 * only what was observed on the page.
 */

const CURRENCY_BY_SYMBOL = {
  '\u0024': 'USD', '\u20AC': 'EUR', '\u00A3': 'GBP', 'A$': 'AUD',
  '\u20B9': 'INR', '\u00A5': 'JPY', '\u0E3F': 'THB', '\u20A9': 'KRW',
};
const CURRENCY_CODES = ['USD', 'INR', 'EUR', 'GBP', 'AUD', 'JPY', 'CAD', 'AED', 'SAR', 'EGP', 'SGD', 'CHF', 'CNY', 'KRW'];

function decodeCurrency(text, hinted) {
  const hint = [hinted, String(text || '').toUpperCase().match(/\b(INR|USD|GBP|EUR|AED|SAR|CAD|AUD|JPY)\b/)?.[1]]
    .find((h) => h && CURRENCY_CODES.includes(h.toUpperCase()));
  if (hint) return hint.toUpperCase();
  const sym = String(text || '').match(/[^\d\s.,-]/);
  if (sym && CURRENCY_BY_SYMBOL[sym[0]]) return CURRENCY_BY_SYMBOL[sym[0]];
  return 'INR';
}

function normalizePrice(value) {
  if (value == null) return null;
  const n = parseFloat(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function cleanTitle(title) {
  if (title == null) return null;
  const t = String(title).replace(/\s+/g, ' ').trim();
  return t.length <= 240 ? (t || null) : t.slice(0, 240);
}

function cleanImages(images, baseUrl) {
  const out = [];
  for (const img of images || []) {
    if (!img || typeof img !== 'string') continue;
    if (/^data:/i.test(img) || /\.svg|placehold\.co|1x1\.gif/i.test(img)) continue;
    let resolved = img;
    try { resolved = new URL(img, baseUrl).href; } catch { /* keep as-is */ }
    if (out.indexOf(resolved) === -1) out.push(resolved);
  }
  return out.slice(0, 12);
}

function parseAvailability(text) {
  if (!text) return { inStock: null, label: null };
  const t = String(text).toLowerCase();
  if (/(out of stock|currently unavailable|sold out|temporarily unavailable|not in stock|not available)/.test(t)) return { inStock: false, label: String(text).trim() };
  if (/(in stock|available|dispatch|in a day)/.test(t)) return { inStock: true, label: String(text).trim() };
  return { inStock: null, label: String(text).trim() };
}

function parseDelivery(text) {
  if (!text) return null;
  const t = String(text).toLowerCase();
  const m = t.match(/\b(\d{1,2})\s*(days?|business days?|weeks?)\b/);
  if (m) {
    const n = parseInt(m[1], 10);
    const isWeek = m[2].includes('week');
    return { value: isWeek ? n * 7 : n, unit: isWeek ? 'weeks' : 'days', label: String(text).trim() };
  }
  if (/tomorrow|next day|overnight/.test(t)) return { value: 1, unit: 'days', label: String(text).trim() };
  return null;
}

function specsToObject(specRows) {
  const obj = {};
  for (const s of specRows || []) {
    if (s && s.label && s.value && !obj[s.label]) obj[s.label] = s.value;
  }
  return Object.keys(obj).length ? obj : null;
}

function pickLongest(values) {
  const present = values.filter((v) => v != null && String(v).trim().length);
  if (!present.length) return null;
  return present.reduce((a, b) => (String(b).length > String(a).length ? b : a));
}

function scoreQuality(parts) {
  const signals = [];
  if (parts.title) signals.push(['title', 'rich']);
  if (parts.price) signals.push(['price', 'rich']);
  if (parts.brand) signals.push(['brand', 'rich']);
  if (parts.images && parts.images.length) signals.push(['images', 'rich']);
  if (parts.description) signals.push(['description', 'rich']);
  if (parts.ratingCount != null && parts.ratingCount > 10) signals.push(['reviews', 'rich']);
  else if (parts.reviewCount != null && parts.reviewCount > 0) signals.push(['reviews', 'limited']);
  if (parts.specs && parts.specs.length) signals.push(['specs', 'rich']);

  const rich = signals.filter((s) => s[1] === 'rich').length;
  const level = rich >= 4 ? 'rich' : rich >= 3 ? 'good' : rich >= 2 ? 'limited' : 'sparse';
  return { level, score: Math.round((rich / 7) * 100), signals: signals.map((s) => s[0]) };
}

/**
 * @param {object} merged  merged extraction: metadataHarvester + domExtractor + extras
 * @param {object} opts    { site, baseUrl }
 */
function normalize(merged, { site, baseUrl } = {}) {
  const price = normalizePrice(merged.price);
  const original = normalizePrice(merged.originalPrice);
  const aux = parseAvailability(merged.availabilityText || merged.availability);
  const delivery = parseDelivery(merged.delivery);
  const specs = Array.isArray(merged.specs) ? merged.specs : [];
  const specObj = specsToObject(specs);
  const images = cleanImages(merged.images, baseUrl);
  const ratingValue = merged.ratingValue != null && merged.ratingValue <= 5 ? Number(merged.ratingValue) : null;
  const ratingCount = merged.ratingCount != null ? Math.round(merged.ratingCount) : null;

  const originalPrice = price && original && original > price ? original : null;

  const staged = merged.availabilityStaged || merged.availability;
  const stagedStr = staged ? String(staged).toLowerCase() : null;
  let availability;
  if (stagedStr && /outofstock/.test(stagedStr)) availability = false;
  else if (stagedStr && /instock|in_stock/.test(stagedStr)) availability = true;
  else availability = aux.inStock;

  const product = {
    title: cleanTitle(merged.title),
    brand: (() => {
      if (!merged.brand) return null;
      const b = String(merged.brand)
        .replace(/\s+/g, ' ')
        .replace(/^visit the\s+/i, '')
        .replace(/\s+store$/i, '')
        .replace(/\s+official\s+store$/i, '')
        .trim();
      return (b || null) && b.slice(0, 60);
    })(),
    price,
    originalPrice,
    currency: decodeCurrency(merged.currency || (merged.priceRaw ? String(merged.priceRaw) : ''), merged.currency),
    image: images[0] || null,
    images,
    gallery: images,
    url: merged.url || null,
    seller: merged.seller ? String(merged.seller).trim().slice(0, 80) : null,
    availability,
    availabilityLabel: aux.label || null,
    deliveryTime: delivery,
    sku: merged.sku || merged.mpn || null,
    model: merged.model || merged.mpn || null,
    mpn: merged.mpn || null,
    category: merged.category || null,
    description: pickLongest([merged.description, merged.ogDescription, merged.metaDescription]),
    features: Array.isArray(merged.features)
      ? merged.features.map((f) => String(f || '').replace(/\s+/g, ' ').trim()).filter((f) => f.length > 2).slice(0, 25)
      : [],
    specifications: specObj,
    specRows: specs.slice(0, 40),
    rating: ratingValue || null,
    ratingCount,
    reviewCount: merged.reviewsCount != null ? Math.round(merged.reviewsCount) : null,
    starDistribution: merged.starDistribution || null,
    warranty: merged.warranty || null,
    weight: normalizePrice(merged.weight),
    material: merged.material || null,
    color: merged.color || null,
    launchDate: merged.launchDate || null,
    manufacturer: merged.manufacturer || null,
    country: merged.country || null,
    productUrl: merged.url || null,
  };

  product.quality = scoreQuality({
    title: product.title,
    price: product.price,
    brand: product.brand,
    images: product.images,
    description: product.description,
    ratingCount: product.ratingCount,
    reviewCount: product.reviewCount,
    specs: product.specRows,
  });

  return product;
}

module.exports = { normalize, decodeCurrency, normalizePrice, cleanImages, specsToObject };