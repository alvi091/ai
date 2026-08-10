const { asyncHandler } = require('../utils/asyncHandler');
const amazonService = require('../services/amazonService');

const search = asyncHandler(async (req, res) => {
  const { q, page = 1, country } = req.query;
  const result = await amazonService.searchProducts(q, parseInt(page, 10) || 1, country);
  res.json({ products: result.products, totalResults: result.total, cached: result.cached });
});

const getByAsin = asyncHandler(async (req, res) => {
  const { asin } = req.params;
  const { country } = req.query;
  const { product } = await amazonService.getProductByAsin(asin, country);
  let reviewSamples = [];
  if (product.reviewSamples) { try { reviewSamples = JSON.parse(product.reviewSamples); } catch {} }
  res.json({ product, reviewSummary: reviewSamples });
});

const sync = asyncHandler(async (req, res) => {
  const { queries } = req.body || {};
  const report = await amazonService.syncCatalog(queries);
  res.json(report);
});

const status = asyncHandler(async (req, res) => {
  res.json({ enabled: amazonService.enabled(), keyConfigured: amazonService.enabled() });
});

module.exports = { search, getByAsin, sync, status };
