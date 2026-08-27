/*
 * Marketplace comparison routes.
 *   POST /api/marketplace/compare — compare a product across marketplaces
 */

const express = require('express');
const router = express.Router();
const { compareMarketplaces } = require('../services/marketplaceComparisonService');

router.post('/compare', async (req, res) => {
  try {
    const { product, siteLabel, excludeSite } = req.body || {};
    if (!product) return res.status(400).json({ error: 'product data is required' });

    const result = await compareMarketplaces({ product, siteLabel, excludeSite });
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[marketplace] compare error:', err.message);
    res.status(500).json({ error: 'Failed to compare marketplaces' });
  }
});

module.exports = router;
