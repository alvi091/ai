const prisma = require('../database');
const { asyncHandler } = require('../utils/asyncHandler');
const { getAdminStats } = require('../services/analyticsService');

const getAdminDashboard = asyncHandler(async (req, res) => {
  const stats = await getAdminStats();

  const recentUsers = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, name: true, email: true, persona: true, createdAt: true },
  });

  const recentSearches = await prisma.searchHistory.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { user: { select: { name: true } } },
  });

  const trendingProducts = await prisma.product.findMany({
    orderBy: [{ rating: 'desc' }, { reviews: 'desc' }],
    take: 10,
  });

  const priceUpdates = await prisma.priceHistory.findMany({
    orderBy: { date: 'desc' },
    take: 10,
    include: { product: { select: { name: true } } },
  });

  res.json({
    stats,
    recentUsers,
    recentSearches: recentSearches.map(s => ({
      id: s.id, prompt: s.prompt, userName: s.user?.name, date: s.createdAt,
    })),
    trendingProducts,
    priceUpdates,
  });
});

const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await prisma.product.update({
    where: { id },
    data: req.body,
  });
  res.json({ product });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.product.delete({ where: { id } });
  res.json({ message: 'Product deleted' });
});

const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip: (page - 1) * limit,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, persona: true, createdAt: true, _count: { select: { searchHistory: true, wishlist: true } } },
    }),
    prisma.user.count(),
  ]);
  res.json({ users, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } });
});

const updatePrices = asyncHandler(async (req, res) => {
  const { updates } = req.body;
  if (!Array.isArray(updates)) return res.status(400).json({ error: 'updates array required' });
  let count = 0;
  for (const { productId, price } of updates) {
    if (productId && price) {
      await prisma.priceHistory.create({ data: { productId, price } });
      await prisma.product.update({ where: { id: productId }, data: { price } });
      count++;
    }
  }
  res.json({ message: `${count} products updated` });
});

const promoteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await prisma.user.update({
    where: { id: userId },
    data: { role: 'admin' },
    select: { id: true, name: true, email: true, role: true },
  });
  res.json({ user, message: `${user.name} promoted to admin` });
});

const demoteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (userId === req.user.id) {
    return res.status(400).json({ error: 'Cannot demote yourself' });
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: { role: 'user' },
    select: { id: true, name: true, email: true, role: true },
  });
  res.json({ user, message: `${user.name} demoted to user` });
});

module.exports = { getAdminDashboard, updateProduct, deleteProduct, getAllUsers, updatePrices, promoteUser, demoteUser };
