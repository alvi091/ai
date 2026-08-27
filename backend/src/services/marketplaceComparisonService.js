/*
 * Marketplace Comparison service — searches for the same product across
 * supported marketplaces and returns price/rating/availability comparisons.
 *
 * Uses Web Unlocker for Flipkart/Myntra/Meesho/AJIO search pages,
 * Amazon RapidAPI for Amazon, and Cheerio to parse results.
 */

const { STORES } = require('../extractors/websiteRegistry');
const config = require('../config');

const SUPPORTED_MARKETPLACES = ['amazon', 'flipkart', 'myntra', 'meesho', 'ajio'];

const MARKETPLACE_SEARCH_URLS = {
  flipkart: (q) => `https://www.flipkart.com/search?q=${encodeURIComponent(q)}`,
  myntra: (q) => `https://www.myntra.com/${encodeURIComponent(q)}`,
  meesho: (q) => `https://www.meesho.com/search?q=${encodeURIComponent(q)}`,
  ajio: (q) => `https://www.ajio.com/search/?text=${encodeURIComponent(q)}`,
};

const MARKETPLACE_DOMAINS = {
  amazon: 'amazon.in',
  flipkart: 'flipkart.com',
  myntra: 'myntra.com',
  meesho: 'meesho.com',
  ajio: 'ajio.com',
};

/**
 * Search for a product on a specific marketplace using SERP API (Google search).
 * Returns parsed results with price, title, URL from Google's index.
 */
async function searchViaSerpApi(marketplaceId, product) {
  if (!config.serpApi?.key) return null;

  const domain = MARKETPLACE_DOMAINS[marketplaceId];
  if (!domain) return null;

  const query = `${product.brand || ''} ${product.name || ''} buy price site:${domain}`.trim();
  try {
    const { webSearch } = require('./researchService');
    const results = await webSearch(query, 5);
    if (!results || results.length === 0) return null;

    const ACCESSORY_WORDS = /case|cover|charger|cable|protector|guard|stand|holder|mount|adapter|earphone|headphone|earbuds|pouch|sleeve|skin|sticker|tempered|film|strap|band|screen/i;

    for (const r of results) {
      const urlDomain = r.domain || '';
      if (!urlDomain.includes(domain.replace('.com', '').replace('.in', ''))) continue;

      const titleText = r.title || '';
      if (ACCESSORY_WORDS.test(titleText)) continue;

      const priceMatch = (r.snippet || r.title || '').match(/₹[\s]*([\d,]+)/);
      const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : null;

      if (!price || price < 500) continue;

      return {
        marketplace: getStoreEntry(marketplaceId)?.label || marketplaceId,
        price,
        originalPrice: null,
        rating: null,
        reviewCount: null,
        seller: null,
        availability: 'In Stock',
        url: r.url || null,
        matchConfidence: calculateMatchConfidence(product, { name: titleText, title: titleText }),
        source: 'serp',
      };
    }
    return null;
  } catch (err) {
    console.log(`[marketplace-compare] SERP search failed for ${marketplaceId}:`, err.message);
    return null;
  }
}

function getStoreEntry(storeId) {
  return STORES.find((s) => s.id === storeId) || null;
}

async function searchAmazon(product) {
  try {
    const amazonService = require('./amazonService');
    if (!amazonService || !amazonService.searchProducts) return null;
    const results = await amazonService.searchProducts(product.name, { limit: 3 });
    if (!results || !results.length) return null;
    const best = results[0];
    return {
      marketplace: 'Amazon',
      price: best.price || best.current_price || null,
      originalPrice: best.originalPrice || null,
      rating: best.rating || null,
      reviewCount: best.reviewCount || best.reviews || null,
      seller: best.seller || null,
      availability: best.inStock !== false ? 'In Stock' : 'Out of Stock',
      url: best.url || best.productUrl || null,
      matchConfidence: calculateMatchConfidence(product, best),
    };
  } catch (err) {
    console.log('[marketplace-compare] Amazon search failed:', err.message);
    return null;
  }
}

/**
 * Search a marketplace using Web Unlocker and parse the first result.
 */
async function searchMarketplaceViaUnlocker(marketplaceId, product) {
  if (!config.webUnlocker?.enabled) return null;
  if (!MARKETPLACE_SEARCH_URLS[marketplaceId]) return null;

  try {
    const { fetchViaUnlocker } = require('./webUnlocker');
    const query = `${product.brand || ''} ${product.name || ''}`.trim();
    const searchUrl = MARKETPLACE_SEARCH_URLS[marketplaceId](query);

    const result = await fetchViaUnlocker(searchUrl, {
      proxy: 'residential:in',
      mode: 'auto',
      timeoutMs: 20000,
    });

    if (!result.ok || !result.html) return null;

    return parseSearchResults(marketplaceId, result.html, product);
  } catch (err) {
    console.log(`[marketplace-compare] ${marketplaceId} search failed:`, err.message);
    return null;
  }
}

/**
 * Parse search result HTML to extract the first matching product.
 */
function parseSearchResults(marketplaceId, html, product) {
  try {
    const cheerio = require('cheerio');
    const $ = cheerio.load(html);

    let price = null;
    let title = null;
    let url = null;
    let rating = null;

    switch (marketplaceId) {
      case 'flipkart': {
        // Flipkart search results: price in ._30jeq3, title in ._4rR01T, link in a tag
        const firstCard = $('div[data-id]').first() || $('div._1AtVbE').first() || $('div.tUxRFH').first();
        if (firstCard.length) {
          title = firstCard.find('a[href="/p/"], a._1fQZEK, a.s1Q9rs, a._4rR01T').first().text().trim() || null;
          url = firstCard.find('a[href="/p/"], a._1fQZEK, a.s1Q9rs').first().attr('href') || null;
          if (url && !url.startsWith('http')) url = `https://www.flipkart.com${url}`;
          const priceText = firstCard.find('._30jeq3, div._1_WHN1').first().text().trim();
          price = parsePrice(priceText);
          const ratingText = firstCard.find('div._3LWZlK, div._2d4LTz').first().text().trim();
          rating = parseRating(ratingText);
        }
        break;
      }
      case 'myntra': {
        // Myntra search: product listing with .product-productMetaInfo
        const firstCard = $('li.product-base, div.product-productMetaInfo').first();
        if (firstCard.length) {
          title = firstCard.find('h3.product-brand, h4.product-brand').first().text().trim() || null;
          const subtitle = firstCard.find('h2.product-name, h4.product-name').first().text().trim();
          if (subtitle) title = title ? `${title} ${subtitle}` : subtitle;
          url = firstCard.find('a').first().attr('href') || null;
          if (url && !url.startsWith('http')) url = `https://www.myntra.com${url}`;
          const priceText = firstCard.find('.product-price, span.product-discountedPrice').first().text().trim();
          price = parsePrice(priceText);
          const ratingText = firstCard.find('.product-ratingsContainer span').first().text().trim();
          rating = parseRating(ratingText);
        }
        break;
      }
      case 'meesho': {
        // Meesho search: product cards with data attributes
        const firstCard = $('div[data-testid="product-card"], div.product-card, div[class*="ProductList"]').first();
        if (firstCard.length) {
          title = firstCard.find('h2, div[class*="title"], div[class*="name"]').first().text().trim() || null;
          url = firstCard.find('a').first().attr('href') || null;
          if (url && !url.startsWith('http')) url = `https://www.meesho.com${url}`;
          const priceText = firstCard.find('span[class*="price"], div[class*="price"]').first().text().trim();
          price = parsePrice(priceText);
        }
        break;
      }
      case 'ajio': {
        // AJIO search: .item cards with .price-amount
        const firstCard = $('div.item, div.rilrtl-products-list__item').first();
        if (firstCard.length) {
          title = firstCard.find('a.nameCls, div.brand').first().text().trim() || null;
          const brand = firstCard.find('div.brand').first().text().trim();
          const name = firstCard.find('a.nameCls').first().text().trim();
          if (brand && name) title = `${brand} ${name}`;
          url = firstCard.find('a').first().attr('href') || null;
          if (url && !url.startsWith('http')) url = `https://www.ajio.com${url}`;
          const priceText = firstCard.find('span.price-amount, div.price strong').first().text().trim();
          price = parsePrice(priceText);
        }
        break;
      }
    }

    if (!price && !title) return null;

    return {
      marketplace: getStoreEntry(marketplaceId)?.label || marketplaceId,
      price,
      originalPrice: null,
      rating,
      reviewCount: null,
      seller: null,
      availability: 'In Stock',
      url,
      matchConfidence: calculateMatchConfidence(product, { name: title, title }),
    };
  } catch (err) {
    console.log(`[marketplace-compare] Parse error for ${marketplaceId}:`, err.message);
    return null;
  }
}

function parsePrice(text) {
  if (!text) return null;
  const cleaned = String(text).replace(/[^\d.]/g, '');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function parseRating(text) {
  if (!text) return null;
  const num = parseFloat(String(text).replace(/[^\d.]/g, ''));
  return Number.isFinite(num) && num > 0 && num <= 5 ? num : null;
}

function calculateMatchConfidence(original, candidate) {
  let score = 0;
  const origName = String(original.name || '').toLowerCase();
  const candName = String(candidate.name || candidate.title || '').toLowerCase();

  if (original.brand && candidate.brand) {
    if (String(original.brand).toLowerCase() === String(candidate.brand).toLowerCase()) score += 30;
  }

  const origWords = origName.split(/\s+/).filter((w) => w.length > 2);
  const candWords = candName.split(/\s+/).filter((w) => w.length > 2);
  const overlap = origWords.filter((w) => candWords.some((cw) => cw.includes(w) || w.includes(cw)));
  score += Math.min(40, (overlap.length / Math.max(1, origWords.length)) * 40);

  if (original.model && candidate.model) {
    if (String(original.model).toLowerCase() === String(candidate.model).toLowerCase()) score += 20;
  }

  if (original.sku && candidate.sku) {
    if (String(original.sku).toLowerCase() === String(candidate.sku).toLowerCase()) score += 10;
  }

  return Math.min(100, Math.round(score));
}

async function compareMarketplaces({ product, siteLabel, excludeSite = null }) {
  const results = [];

  const sourceEntry = {
    marketplace: siteLabel || 'Source',
    price: product.price || null,
    originalPrice: product.originalPrice || null,
    rating: product.rating || null,
    reviewCount: product.ratingCount || product.reviewCount || null,
    seller: product.seller || null,
    availability: product.availability !== false ? 'In Stock' : 'Out of Stock',
    url: product.url || null,
    matchConfidence: 100,
    isSource: true,
  };
  results.push(sourceEntry);

  const searchPromises = SUPPORTED_MARKETPLACES.map(async (mpId) => {
    if (mpId === excludeSite) return null;

    if (mpId === 'amazon') {
      const amazonResult = await searchAmazon(product);
      if (amazonResult) return amazonResult;
    }

    // Try Web Unlocker first
    const unlockerResult = await searchMarketplaceViaUnlocker(mpId, product);
    if (unlockerResult) return unlockerResult;

    // Fallback: SERP API search
    return searchViaSerpApi(mpId, product);
  });

  const searchResults = await Promise.allSettled(searchPromises);

  for (const result of searchResults) {
    if (result.status === 'fulfilled' && result.value && result.value.matchConfidence >= 30) {
      const isDuplicate = results.some(
        (r) => r.marketplace === result.value.marketplace || (r.url && result.value.url && r.url === result.value.url)
      );
      if (!isDuplicate) {
        results.push(result.value);
      }
    }
  }

  for (const mpId of SUPPORTED_MARKETPLACES) {
    if (mpId === excludeSite) continue;
    const entry = getStoreEntry(mpId);
    if (!entry) continue;
    const alreadyAdded = results.some((r) => r.marketplace === entry.label);
    if (!alreadyAdded) {
      const hasAnyApi = config.webUnlocker?.enabled || config.serpApi?.key;
      results.push({
        marketplace: entry.label,
        price: null,
        rating: null,
        reviewCount: null,
        seller: null,
        availability: hasAnyApi ? 'No match found' : 'Data unavailable',
        url: null,
        matchConfidence: 0,
        note: hasAnyApi
          ? `No matching product found on ${entry.label}`
          : `${entry.label} data requires API keys to be configured.`,
      });
    }
  }

  const withPrices = results.filter((r) => r.price != null && r.price > 0);
  let bestPlace = null;
  if (withPrices.length > 1) {
    const sorted = [...withPrices].sort((a, b) => a.price - b.price);
    bestPlace = sorted[0].marketplace;
  }

  return {
    comparisons: results,
    bestPlace,
    totalCompared: results.length,
    dataAvailable: withPrices.length,
  };
}

module.exports = { compareMarketplaces, searchAmazon, calculateMatchConfidence };
