const prisma = require('../database');
const { paginate } = require('../utils/helpers');
const { NotFoundError } = require('../utils/errors');
const { asyncHandler } = require('../utils/asyncHandler');
const amazonService = require('../services/amazonService');

const getProducts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, category, brand, sort, minPrice, maxPrice, search, marketplace } = req.query;
  const { skip, take } = paginate(page, limit);
  const where = {};
  if (category) where.category = { contains: category, mode: 'insensitive' };
  if (brand) where.brand = { contains: brand, mode: 'insensitive' };
  if (marketplace) where.marketplace = { contains: marketplace, mode: 'insensitive' };
  if (minPrice || maxPrice) { where.price = {}; if (minPrice) where.price.gte = parseFloat(minPrice); if (maxPrice) where.price.lte = parseFloat(maxPrice); }
  if (search) { where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } }, { brand: { contains: search, mode: 'insensitive' } }]; }
  let orderBy = { rating: 'desc' };
  if (sort === 'price_asc') orderBy = { price: 'asc' };
  if (sort === 'price_desc') orderBy = { price: 'desc' };
  if (sort === 'rating') orderBy = { rating: 'desc' };
  if (sort === 'newest') orderBy = { createdAt: 'desc' };
  const [products, total] = await Promise.all([prisma.product.findMany({ where, skip, take, orderBy }), prisma.product.count({ where })]);
  res.json({ products, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } });
});

const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  let product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new NotFoundError('Product not found');

  if (product.source === 'amazon' && product.asin) {
    try {
      const refreshed = await amazonService.getProductByAsin(product.asin);
      product = refreshed.product;
    } catch { /* keep cached row when API unavailable */ }
  }

  const related = await prisma.product.findMany({ where: { category: product.category, id: { not: product.id } }, take: 6, orderBy: { rating: 'desc' } });
  let reviewSummary = null;
  if (product.reviewSamples) { try { reviewSummary = JSON.parse(product.reviewSamples); } catch { reviewSummary = null; } }
  res.json({ product, related, reviewSummary });
});

const getCategories = asyncHandler(async (req, res) => {
  const categories = await prisma.product.groupBy({ by: ['category'], _count: { id: true }, orderBy: { _count: { id: 'desc' } } });
  res.json({ categories: categories.map((c) => ({ name: c.category, count: c._count.id })) });
});

const getTrending = asyncHandler(async (req, res) => {
  const products = await prisma.product.findMany({ orderBy: [{ rating: 'desc' }, { reviews: 'desc' }], take: 12 });
  res.json({ products });
});

module.exports = { getProducts, getProductById, getCategories, getTrending };
