const { findByName } = require('./marketplaceCatalog');

function enrichProduct(dbProduct) {
  if (!dbProduct) return dbProduct;

  const full = findByName(dbProduct.name, dbProduct.marketplace);
  if (!full) return dbProduct;

  const dbReviews = (() => {
    if (!dbProduct.reviewSamples) return [];
    try { return JSON.parse(dbProduct.reviewSamples); } catch { return []; }
  })();

  const reviews = (Array.isArray(full.reviews) && full.reviews.length ? full.reviews : dbReviews);

  return {
    ...dbProduct,
    reviews,
    rating_breakdown: full.rating_breakdown || undefined,
    price_history: Array.isArray(full.price_history) ? full.price_history : [],
    catalogCurrentPrice: full.current_price != null ? full.current_price : undefined,
  };
}

module.exports = { enrichProduct };
