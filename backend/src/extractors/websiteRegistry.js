/*
 * Website registry — the extensible detection & extraction-strategy layer.
 *
 * Every supported website declares:
 *   - domains that route to it
 *   - an `isProductPath` classifier (path-level product detection)
 *   - CSS selectors that map DOM nodes onto the canonical product model
 *
 * `detectSite(url)` returns a profile. If nothing matches a known store,
 * the generic profile is used (still backed by structured metadata + heuristics).
 */

const SELECTORS = {
  amazon: {
    title: ['h1#title', '#productTitle', 'span#productTitle'],
    price: ['#corePrice_desktop span.a-offscreen', '#corePriceDisplay_desktop_feature_div .a-offscreen', '#corePrice_feature_div span.a-offscreen', 'div#apex_desktop span.a-offscreen', '#priceblock_ourprice', '#priceblock_dealprice', 'span.a-price span.a-offscreen'],
    originalPrice: ['span#priceblock_was_price .a-offscreen', '.basisPrice .a-offscreen', 'span.a-text-price span.a-offscreen', 'span[class*="priceToPay"]'],
    brand: ['#bylineInfo', 'a#bylineInfo'],
    image: ['#landingImage', '#imgBlkFront', 'img#landingImage'],
    images: ['#altImages img', '.imageThumbnail img', 'img#altImages img'],
    ratingValue: ['[data-hook="rating-out-of-text"]', 'div[data-hook="rating-out-of-text"] span'],
    ratingCount: ['#acrCustomerReviewText', 'div[data-hook="total-review-count"]'],
    availability: ['#availability span', '#availability'],
    outOfStock: ['#outOfStockBuyBox_feature_div'],
    seller: ['#sellerProfileTriggerId', '#merchant-info'],
    description: ['#aplus_feature_div', '#productDescription', '#aplus'],
    features: ['#feature-bullets li span.a-list-item', '[class*="feature-bullets"] li'],
    specsTable: ['#productDetails_techSpec_section_1 tr', '#prodDetails tr', '#productOverview_feature_div tr'],
    reviews: ['[data-hook="review"]', '[class*="single-review"]'],
    reviewRating: ['[data-hook="review-star-rating"] span', '[data-hook="review-star-rating"]'],
    reviewText: ['[data-hook="reviewText"]', '[data-hook="review-body"]'],
    reviewTitle: ['[data-hook="reviewTitle"]', '[data-hook="review-title"] span:last-child'],
    reviewDate: ['[data-hook="review-date"]'],
    reviewVerified: ['[data-hook="avp-badge"]'],
    reviewAuthor: ['.a-profile-name', '[data-hook="review-author"]'],
  },
  flipkart: {
    title: ['span.VU-ZEz', 'h1._6EBuvT span', 'span.B_NUCI'],
    price: ['div.NYO5GQ', 'div._30jeQ3._16Jk6d', 'div._30jeQ3'],
    originalPrice: ['div._3I9_wc._2p6lqe', 'div._3I9_wc'],
    image: ['ul._1YokD2 img', 'div._4WELSP img', 'img._396cs4'],
    ratingValue: ['div._3LWZlK', 'div[class*="rating"] span'],
    ratingCount: ['div._3uwCn_', 'span._3uwCn_'],
    features: ['ul._9QTI1J li'],
    description: ['div._1mXcCf'],
    specsTable: ['div._3I9W74 tr', 'div[class*="spec"] tr'],
    seller: ['div[class*="sellerName"]'],
    reviews: ['div._1AtVbE div[class*="col _2wzgFH"]', 'div[class*="review"]'],
    reviewText: ['div.t-Z-TK', 'div.qFY0AF'],
    reviewRating: ['div._3LWZl', 'div[class*="rating"]'],
    reviewTitle: ['p._2-N8zT'],
  },
  myntra: {
    title: ['h1.title', 'h1.pdp-title', 'span.pdp-name'],
    price: ['strong.pdp-price', 'div.pdp-product-price span.pdp-final-price'],
    originalPrice: ['div.pdp-price-details-delivery strike', 'span.pdp-strike-price'],
    brand: ['h3.brand', 'span.pdp-brand'],
    image: ['img.ts-san', 'img[alt*="product"]', '.image-grid-desktop img'],
    description: ['div.pdp-description-container div p', 'div.index-description'],
    specsTable: ['div.index-row', 'div.details-table tr'],
    reviews: ['div.user-review-main div.item-card-main'],
    reviewText: ['div.review-main-content span.block'],
  },
  ajio: {
    title: ['h1.title', 'div.product-name h1'],
    price: ['span.price-amount', 'div.price span'],
    originalPrice: ['span.price-old'],
    brand: ['div.product-brand h2'],
    image: ['img.rilrtl-lazy-img'],
    description: ['div.product-description', 'div.pdp-info'],
  },
  nykaa: {
    title: ['h1[class*="ProductTitle"]', 'h1[class*="css-"]'],
    price: ['div[class*="Price"] span', 'p[class*="price"]'],
    originalPrice: ['div[class*="mrp"]', 'span[class*="strike"]'],
    image: ['img[class*="productImage"]'],
    brand: ['h2[class*="brand"]', 'span[class*="brand"]'],
    reviews: ['div[class*="review"]'],
  },
  apple: {
    title: ['h1.product-header-title', 'h1.rc-producttitle', '#tabs-title'],
    price: ['span.rc-prices-full-price', 'span.as-price-currentprice'],
    image: ['div.selected img', 'fig.rc-pdp-ic img'],
    specs: ['td.column.specs-value', 'div.product-spec'],
  },
  samsung: {
    title: ['div.PDPTab-title', 'h1.heading-title'],
    price: ['span.st-inner__price', 'div.PDPTab-price strong'],
    image: ['img[alt]', 'div.product-image img'],
  },
  nike: {
    title: ['h1#pdp_product_title', 'h1.headline-4'],
    price: ['div.product-price span', 'span[data-testid*="price"]'],
    image: ['img[alt]', 'div#pdp-media img'],
    reviews: ['div[data-testid*="review"]'],
  },
  adidas: {
    title: ['h1.gl-heading', 'h1[data-auto-id="product-title"]'],
    price: ['div[data-auto-id="price"]', 'div.gl-price-item'],
    image: ['img[data-auto-id*="image"]'],
  },
  croma: {
    title: ['h1.pdp-title', 'div.product-name h1'],
    price: ['div.offer_amt', 'span.offer-price'],
    originalPrice: ['span.mrp-price'],
    brand: ['div.tech-spec p'],
    image: ['div.product-image img'],
    specs: ['div.product-details p'],
  },
  meesho: {
    title: ['h1', 'span[class*="product-title"]', 'div[class*="ProductTitle"]', '[data-testid*="title"]'],
    price: ['span[class*="price"]', 'div[class*="Pricing"]', '[data-testid*="price"]'],
    originalPrice: ['span[class*="strike"]', 'del'],
    image: ['img[class*="product"]', 'img[class*="image"]', 'img[alt*="product"]'],
    brand: ['span[class*="brand"]', '[class*="SellerName"]'],
    specsTable: ['table tr', 'div[class*="spec"] tr'],
    reviews: ['div[class*="review"]', '[data-testid*="review"]'],
    reviewText: ['[class*="reviewText"]', 'p[class*="review"]'],
  },
  relianceDigital: {
    title: ['h1.product-name', 'h1.title-product'],
    price: ['span.actual-price', 'div.current-price'],
    image: ['img.zoom img'],
    specs: ['div.spec li'],
  },
  noon: {
    title: ['h1.sc-6c86e31-0', 'h1.sc-b14fd4eb-0', 'h1[class*="sc-"]', '[class*="productTitle"]', 'h1'],
    price: ['div[class*="price"] span[class*="currency"]', 'span[class*="priceAmount"]', '[data-qa="price"]', 'strong[class*="price"]'],
    originalPrice: ['span[class*="was_price"]', '[class*="oldPrice"]', 'del'],
    brand: ['a[class*="brand"]', '[class*="brandName"]'],
    image: ['img[class*="productImage"]', 'img[class*="gallery"]'],
    ratingValue: ['[class*="rating"] strong', '[class*="ratingValue"]'],
    ratingCount: ['[class*="ratingCount"]', '[class*="reviews_count"]'],
    description: ['div[class*="description"]', 'div[class*="productDescription"]'],
    specsTable: ['div[class*="specification"] tr', 'table tr'],
  },
  namshi: {
    title: ['h1[class*="productName"]', 'h1[class*="title"]', 'div[class*="product-name"] h1'],
    price: ['span[class*="finalPrice"]', 'div[class*="price-block"] span', 'span[class*="price"]:not([class*="old"])'],
    originalPrice: ['span[class*="oldPrice"]', 'del'],
    brand: ['span[class*="brand"]', 'a[class*="brand"]'],
    image: ['img[class*="productImage"]', 'img[class*="gallery"]'],
    ratingValue: ['div[class*="rating"] span', 'span[class*="rating"]'],
    ratingCount: ['span[class*="count"]'],
    description: ['div[class*="description"]'],
    specsTable: ['div[class*="specification"] tr', 'table tr'],
  },
  carrefour: {
    title: ['h1[class*="productTitle"]', 'h1[class*="title"]', 'div[class*="product-name"] h1', 'h1'],
    price: ['span[class*="price"]', 'strong[class*="price"]', '[class*="ProductPrice"]'],
    originalPrice: ['span[class*="oldPrice"]', 'del', '[class*="was-price"]'],
    brand: ['a[class*="brand"]', '[class*="brandName"]'],
    image: ['img[class*="productImage"]', 'img[class*="gallery"]'],
    ratingValue: ['div[class*="rating"] span', 'span[class*="rating"]'],
    ratingCount: ['span[class*="count"]'],
    description: ['div[class*="description"]', 'div[class*="productDescription"]'],
    specsTable: ['div[class*="specification"] tr', 'table tr'],
  },
  sharafDG: {
    title: ['h1[class*="product-name"]', 'h1[class*="title"]', 'div[class*="product-title"] h1', 'h1'],
    price: ['span[class*="price"]', 'strong[class*="price"]', '[class*="current-price"]'],
    originalPrice: ['span[class*="old-price"]', 'del', '[class*="line-through"]'],
    brand: ['a[class*="brand"]', '[class*="brandName"]'],
    image: ['img[class*="product-image"]', 'img[class*="gallery"]'],
    ratingValue: ['div[class*="rating"] span', 'span[class*="rating"]'],
    ratingCount: ['span[class*="count"]'],
    description: ['div[class*="description"]'],
    specsTable: ['div[class*="specification"] tr', 'table tr'],
  },
  dubaiStore: {
    title: ['h1[class*="product-title"]', 'h1[class*="title"]', 'div[class*="product-name"] h1', 'h1'],
    price: ['span[class*="price"]', 'strong[class*="price"]', '[class*="current-price"]'],
    originalPrice: ['span[class*="old-price"]', 'del', '[class*="list-price"]'],
    brand: ['a[class*="brand"]', '[class*="brandName"]'],
    image: ['img[class*="product-image"]', 'img[class*="gallery"]'],
    ratingValue: ['div[class*="rating"] span', 'span[class*="rating"]'],
    ratingCount: ['span[class*="count"]'],
    description: ['div[class*="description"]'],
    specsTable: ['div[class*="specification"] tr', 'table tr'],
  },
};

const GENERIC = {
  title: ['h1'],
  price: ['[itemprop="price"]', 'meta[itemprop="price"]', 'span[class*="price-now"]', 'span[class*="Price"]', '[class*="final_price"]', '[class*="offer_price"]'],
  originalPrice: ['span[class*="strike"]', 'span[class*="mrp"]', '[itemprop="highPrice"]'],
  brand: ['[itemprop="brand"] [itemprop="name"]', '[class*="brand"] a', '[class*="brand"] span', 'meta[itemprop="brand"]'],
  image: ['meta[property="og:image"]', '[class*="product-image"] img', 'img[class*="product"]', '[class*="gallery"] img'],
  images: ['[class*="gallery"] img', 'img[class*="thumb"]'],
  description: ['[itemprop="description"]', 'meta[itemprop="description"]', '[class*="description"]'],
  specsTable: ['table tr', 'dl', '[class*="specification"] li', '[class*="spec"] li'],
  features: ['[class*="feature"] li', 'ul[class*="bullet"] li'],
  reviews: ['[itemprop="review"]', '[data-hook="review"]', '[class*="review-card"]', '[class*="single-review"]', '[class*="reviews"] [class*="comment"]'],
  reviewText: ['[data-hook="reviewText"]', '[itemprop="reviewBody"]', '[class*="review-text"]', '[class*="single-review-text-container"]', '[class*="review"] p', '[class*="comment"]'],
  reviewRating: ['[itemprop="reviewRating"] [itemprop="ratingValue"]', 'meta[itemprop="ratingValue"]', '[itemprop="ratingValue"]', '[aria-label*="out of 5"]'],
  reviewTitle: ['[data-hook="reviewTitle"]'],
  reviewDate: ['[itemprop="datePublished"]', 'time', '[class*="review-date"]'],
  reviewVerified: ['[class*="verified"]'],
  reviewAuthor: ['[itemprop="author"]', '[class*="review-author"]', '[class*="reviewer-name"]', '[class*="profile-name"]'],
};

const STORES = [
  {
    id: 'amazon',
    label: 'Amazon',
    domains: ['amazon.com', 'amazon.in', 'amazon.co', 'amazon.de', 'amazon.fr', 'amazon.co.uk', 'amazon.ca', 'amazon.it', 'amazon.es', 'amazon.nl', 'amazon.com.au', 'amazon.sg', 'amazon.com.br', 'amazon.com.mx', 'amazon.ae', 'amazon.sa', 'amazon.eg'],
    selectors: { ...GENERIC, ...SELECTORS.amazon },
    isProductPath: (path) => /\/dp\//.test(path) || /\/gp\/product\//.test(path) || /\/product\//.test(path),
    structured: true,
  },
  {
    id: 'flipkart',
    label: 'Flipkart',
    domains: ['flipkart.com', 'dl.flipkart.com'],
    selectors: { ...GENERIC, ...SELECTORS.flipkart },
    isProductPath: (path) => /\/p\/itm|_pid_|pr\/|-p\./i.test(path),
    structured: true,
  },
  {
    id: 'myntra',
    label: 'Myntra',
    domains: ['myntra.com'],
    selectors: { ...GENERIC, ...SELECTORS.myntra },
    isProductPath: (path) => /\/buy\/?$/.test(path) || /\/buy\//.test(path),
    structured: true,
  },
  {
    id: 'ajio',
    label: 'Ajio',
    domains: ['ajio.com'],
    selectors: { ...GENERIC, ...SELECTORS.ajio },
    isProductPath: (path) => /\/p\/|\/product\//.test(path),
    structured: true,
    renderWait: '[class*="product-detail"]',
  },
  {
    id: 'nykaa',
    label: 'Nykaa',
    domains: ['nykaa.com'],
    selectors: { ...GENERIC, ...SELECTORS.nykaa },
    isProductPath: (path) => /\/p\//.test(path),
    structured: true,
  },
  {
    id: 'apple',
    label: 'Apple',
    domains: ['apple.com', 'apple.in'],
    selectors: { ...GENERIC, ...SELECTORS.apple },
    isProductPath: (path) => /\/shop\/buy-|buy\//.test(path),
  },
  {
    id: 'samsung',
    label: 'Samsung',
    domains: ['samsung.com', 'samsung.com/in'],
    selectors: { ...GENERIC, ...SELECTORS.samsung },
    isProductPath: (path) => /\/in\/(smartphones|televisions|audio-video|memory-storage|smarthome|mobile)/.test(path) || /\/p\/|prd/.test(path),
  },
  {
    id: 'nike',
    label: 'Nike',
    domains: ['nike.com'],
    selectors: { ...GENERIC, ...SELECTORS.nike },
    isProductPath: (path) => /\/t\/|w\/|^\/[a-z0-9-]+\/(\d+)$/.test(path),
  },
  {
    id: 'adidas',
    label: 'Adidas',
    domains: ['adidas.com', 'adidas.in'],
    selectors: { ...GENERIC, ...SELECTORS.adidas },
    isProductPath: (path) => /^\/[a-z0-9-]+\/[-0-9]+\.html/.test(path),
  },
  {
    id: 'croma',
    label: 'Croma',
    domains: ['croma.com'],
    selectors: { ...GENERIC, ...SELECTORS.croma },
    isProductPath: (path) => /\/p\//.test(path),
  },
  {
    id: 'relianceDigital',
    label: 'Reliance Digital',
    domains: ['reliancedigital.in'],
    selectors: { ...GENERIC, ...SELECTORS.relianceDigital },
    isProductPath: (path) => /\/p\//.test(path),
  },
  {
    id: 'meesho',
    label: 'Meesho',
    domains: ['meesho.com'],
    selectors: { ...GENERIC, ...SELECTORS.meesho },
    isProductPath: (path) => /\/p\//.test(path),
    renderWait: '[class*="product"]',
    embedded: ['__NEXT_DATA__', 'Product'],
  },
  {
    id: 'noon',
    label: 'Noon',
    domains: ['noon.com', 'noon.uae', 'noon.ae'],
    selectors: { ...GENERIC, ...SELECTORS.noon },
    isProductPath: (path) => /\/products\//.test(path) || /\/product\//.test(path),
    renderWait: '[class*="product"]',
    embedded: ['__NEXT_DATA__', 'Product'],
  },
  {
    id: 'namshi',
    label: 'Namshi',
    domains: ['namshi.com', 'namshi.ae'],
    selectors: { ...GENERIC, ...SELECTORS.namshi },
    isProductPath: (path) => /\/\d+\d*\//.test(path) || /\/buy\//.test(path),
    renderWait: '[class*="product"]',
    embedded: ['__NEXT_DATA__', 'Product'],
  },
  {
    id: 'carrefour',
    label: 'Carrefour',
    domains: ['carrefouruae.com', 'carrefour.com', 'carrefour.ae'],
    selectors: { ...GENERIC, ...SELECTORS.carrefour },
    isProductPath: (path) => /\/p\//.test(path) || /\/product\//.test(path),
    renderWait: '[class*="product"]',
    embedded: ['__NEXT_DATA__', 'Product'],
  },
  {
    id: 'sharafDG',
    label: 'Sharaf DG',
    domains: ['sharafdg.com', 'sharafdgexpress.com'],
    selectors: { ...GENERIC, ...SELECTORS.sharafDG },
    isProductPath: (path) => /\/p\//.test(path) || /\/product\//.test(path),
    renderWait: '[class*="product"]',
    embedded: ['__NEXT_DATA__', 'Product'],
  },
  {
    id: 'dubaiStore',
    label: 'DubaiStore',
    domains: ['dubaistore.com'],
    selectors: { ...GENERIC, ...SELECTORS.dubaiStore },
    isProductPath: (path) => /\/p\//.test(path) || /\/product\//.test(path),
    renderWait: '[class*="product"]',
    embedded: ['__NEXT_DATA__', 'Product'],
  },
];

const PRODUCT_PATH_HINTS = ['product', 'pdp', 'dp/', 'gp/product', 'itm', 'buy', '/p/', '_pid', 'sku'];

// Stores that render product pages via client-side JS and therefore need a
// headless browser (renderFetcher) instead of a plain HTTP fetch.
const JS_STORE_IDS = new Set(['flipkart', 'myntra', 'meesho', 'ajio', 'nykaa', 'noon', 'namshi', 'carrefour', 'sharafDG', 'dubaiStore']);

function needsRendering(siteId) {
  return JS_STORE_IDS.has(siteId);
}

const GENERIC_PROFILE = {
  id: 'generic',
  label: 'Web',
  selectors: GENERIC,
  isProductPath: () => true,
  structured: true,
};

function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function detectSite(url) {
  const host = hostOf(url);
  const path = safePath(url);
  for (const store of STORES) {
    if (store.domains.some((d) => host === d || host.endsWith(`.${d}`))) {
      return { ...store, host, known: true };
    }
  }
  return { ...GENERIC_PROFILE, host, known: false };
}

function safePath(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return '';
  }
}

function looksLikeProduct(url) {
  const path = safePath(url);
  if (PRODUCT_PATH_HINTS.some((h) => path.toLowerCase().includes(h))) return true;
  const host = hostOf(url);
  return Boolean(host) && host.length > 0;
}

function isSupported(url) {
  const site = detectSite(url);
  return site.known !== false;
}

function isProductUrl(url) {
  const site = detectSite(url);
  return site.isProductPath(safePath(url));
}

module.exports = { detectSite, isSupported, isProductUrl, looksLikeProduct, needsRendering, STORES, GENERIC_PROFILE, SELECTORS, GENERIC };
