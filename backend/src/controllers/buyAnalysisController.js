const { analyzeProduct } = require('../services/productAnalytics');
const { generateReport } = require('../services/reportBuilder');
const { getAll } = require('../services/marketplaceCatalog');

const analyzeProductByName = async (req, res) => {
  const { productName } = req.body;
  if (!productName) {
    return res.status(400).json({ error: 'productName is required' });
  }

  const products = getAll();

  const nameLower = productName.toLowerCase().trim();
  let product = products.find((p) => p.name.toLowerCase().trim() === nameLower);

  if (!product) {
    product = products.find((p) => p.name.toLowerCase().includes(nameLower) || nameLower.includes(p.name.toLowerCase()));
  }

  if (!product) {
    const nameWords = nameLower.split(/\s+/).filter((w) => w.length > 2);
    product = products.find((p) => {
      const pWords = p.name.toLowerCase().split(/\s+/);
      const matchCount = nameWords.filter((w) => pWords.includes(w)).length;
      return matchCount >= Math.min(2, nameWords.length);
    });
  }

  if (!product) {
    return res.status(404).json({ error: 'Product not found in catalog' });
  }

  const categoryProducts = products.filter((p) => p.category === product.category);
  const alternatives = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 4);

  const analytics = analyzeProduct({
    product,
    categoryProducts,
    alternatives,
  });
  const aiReport = await generateReport(analytics, { prompt: productName, alternatives });

  const priceHistory = (product.price_history || []).map((h) => h.price);
  const avgPrice = priceHistory.length ? Math.round(priceHistory.reduce((s, p) => s + p, 0) / priceHistory.length) : product.current_price;

  const analysis = {
    worthScore: analytics.worth.score,
    verdict: analytics.worth.score >= 65 ? 'worthy' : analytics.worth.score >= 40 ? 'mixed' : 'not_worthy',
    summary: aiReport.summary.paragraphs[0] || '',
    currentPrice: product.current_price,
    avgPrice,
    lowPrice: analytics.price.low,
    highPrice: analytics.price.high,
    priceTrend: analytics.trend.direction || 'stable',
    priceVerdict: analytics.decision.rationale,
    reviewVerdict: `Average rating ${(product.rating || 0).toFixed(1)}/5 across ${product.reviews_count || 0} reviews.`,
    pros: analytics.reviews.mostLoved.slice(0, 3).map((t) => t.topic),
    cons: analytics.reviews.mostComplained.slice(0, 3).map((t) => t.topic),
    priceHistory: product.price_history || [],
    aiReport,
  };

  res.json({ analysis });
};

module.exports = { analyzeProduct: analyzeProductByName };
