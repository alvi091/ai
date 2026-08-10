const prisma = require('../database');
const AIService = require('../ai/AIService');
const { BadRequestError } = require('../utils/errors');
const { asyncHandler } = require('../utils/asyncHandler');

const aiService = AIService.create('gemini');

const getComparisons = asyncHandler(async (req, res) => {
  const comparisons = await prisma.comparison.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } });
  const full = await Promise.all(comparisons.map(async (c) => {
    const ids = JSON.parse(c.productIds);
    const products = await prisma.product.findMany({ where: { id: { in: ids } } });
    return { ...c, products };
  }));
  res.json({ comparisons: full });
});

const createComparison = asyncHandler(async (req, res) => {
  const { productIds, name } = req.body;
  if (!Array.isArray(productIds) || productIds.length < 2 || productIds.length > 4) throw new BadRequestError('Please select 2-4 products to compare');
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  if (products.length !== productIds.length) throw new BadRequestError('Some products not found');
  let aiComparison = null;
  try { aiComparison = await aiService.compareProducts(products); } catch { aiComparison = null; }
  const comparison = await prisma.comparison.create({
    data: { userId: req.user.id, name: name || `${products[0].name} vs ${products[1].name}`, productIds: JSON.stringify(productIds) },
  });
  res.status(201).json({ comparison: { ...comparison, products }, aiComparison });
});

const deleteComparison = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.comparison.deleteMany({ where: { id, userId: req.user.id } });
  res.json({ message: 'Comparison deleted' });
});

module.exports = { getComparisons, createComparison, deleteComparison };
