const prisma = require('../database');
const { asyncHandler } = require('../utils/asyncHandler');
const { extractReviewMetrics, getAISummary } = require('../services/reviewIntelligence');

const getReviewAnalysis = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const metrics = extractReviewMetrics(product);
  const aiSummary = req.query.ai === 'true' ? await getAISummary(product) : null;

  res.json({ reviewAnalysis: { ...metrics, aiSummary } });
});

module.exports = { getReviewAnalysis };
