/*
 * Research routes.
 *   POST /api/research          — run background research on a product
 *   POST /api/research/analyze  — unified: research + problems + alternatives + marketplace + sentiment
 *   POST /api/research/problems — find common problems
 *   POST /api/research/alternatives — find alternatives
 */

const express = require('express');
const router = express.Router();
const { researchProduct, findCommonProblems, findAlternatives } = require('../services/researchService');
const { compareMarketplaces } = require('../services/marketplaceComparisonService');

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms)),
  ]);
}

function analyzeSentiment(reviews) {
  if (!reviews || !reviews.length) return null;
  const pos = reviews.filter((r) => r.polarity === 'positive' || (r.rating || 0) >= 4);
  const neg = reviews.filter((r) => r.polarity === 'negative' || (r.rating || 0) <= 2);
  const neu = reviews.filter((r) => !pos.includes(r) && !neg.includes(r));

  const avgRating = reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length;

  const aspects = {};
  for (const r of reviews) {
    const aspectsList = String(r.aspects || '').split(/\s+/).filter(Boolean);
    for (const a of aspectsList) {
      if (!aspects[a]) aspects[a] = { positive: 0, negative: 0, neutral: 0, total: 0 };
      aspects[a].total++;
      if (r.polarity === 'positive' || (r.rating || 0) >= 4) aspects[a].positive++;
      else if (r.polarity === 'negative' || (r.rating || 0) <= 2) aspects[a].negative++;
      else aspects[a].neutral++;
    }
  }

  return {
    totalReviews: reviews.length,
    avgRating: Math.round(avgRating * 10) / 10,
    positive: pos.length,
    negative: neg.length,
    neutral: neu.length,
    positivePercent: Math.round((pos.length / reviews.length) * 100),
    negativePercent: Math.round((neg.length / reviews.length) * 100),
    aspects,
  };
}

router.post('/', async (req, res) => {
  try {
    const { productUrl, productName, brand, category } = req.body || {};
    if (!productUrl) return res.status(400).json({ error: 'productUrl is required' });
    const findings = await withTimeout(researchProduct({ productUrl, productName, brand, category }), 20000, 'research');
    res.json({ ok: true, findings, count: findings.length });
  } catch (err) {
    console.error('[research] error:', err.message);
    res.status(500).json({ error: 'Research failed' });
  }
});

router.post('/analyze', async (req, res) => {
  const { productUrl, productName, brand, category, price, rating, ratingCount, reviews, siteLabel } = req.body || {};
  const name = productName || productUrl || 'Unknown Product';

  console.log(`[research/analyze] starting for "${name}" brand=${brand}`);

  const results = await Promise.allSettled([
    withTimeout(researchProduct({ productUrl, productName: name, brand, category }), 35000, 'findings'),
    withTimeout(findCommonProblems({ productName: name, brand, reviews: (reviews || []).slice(0, 20) }), 30000, 'problems'),
    withTimeout(findAlternatives({ productName: name, brand, category, price }), 30000, 'alternatives'),
    withTimeout(compareMarketplaces({ product: { name, brand, price, rating, ratingCount, url: productUrl }, siteLabel }), 30000, 'marketplace'),
  ]);

  const out = {
    ok: true,
    findings: results[0].status === 'fulfilled' ? results[0].value : [],
    problems: results[1].status === 'fulfilled' ? results[1].value : [],
    alternatives: results[2].status === 'fulfilled' ? results[2].value : [],
    marketplace: results[3].status === 'fulfilled' ? results[3].value : null,
    sentiment: analyzeSentiment(reviews || []),
  };

  console.log(`[research/analyze] done: findings=${out.findings.length} problems=${out.problems.length} alternatives=${out.alternatives.length} marketplace=${out.marketplace ? 'yes' : 'no'}`);

  res.json(out);
});

router.post('/problems', async (req, res) => {
  try {
    const { productName, brand, reviews } = req.body || {};
    const problems = await findCommonProblems({ productName, brand, reviews });
    res.json({ ok: true, problems });
  } catch (err) {
    res.status(500).json({ error: 'Problem analysis failed' });
  }
});

router.post('/alternatives', async (req, res) => {
  try {
    const { productName, brand, category, price } = req.body || {};
    const alternatives = await findAlternatives({ productName, brand, category, price });
    res.json({ ok: true, alternatives });
  } catch (err) {
    res.status(500).json({ error: 'Alternative search failed' });
  }
});

module.exports = router;
