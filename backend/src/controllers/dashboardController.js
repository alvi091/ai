const prisma = require('../database');
const { asyncHandler } = require('../utils/asyncHandler');
const { getDashboardData } = require('../services/analyticsService');
const { classifyPersona } = require('../services/personaEngine');

const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user?.id;

  const trendingProducts = await prisma.product.findMany({
    orderBy: [{ rating: 'desc' }, { reviews: 'desc' }],
    take: 6,
  });

  if (!userId) {
    return res.json({
      insights: null,
      totalWishlistValue: 0,
      persona: null,
      decisionAccuracy: 0,
      recentDecisions: [],
      favoriteCategories: [],
      trendingProducts,
      wishlistItems: [],
      searchHistory: [],
      guest: true,
    });
  }

  const data = await getDashboardData(userId);

  const wishlistItems = await prisma.wishlist.findMany({
    where: { userId },
    include: { product: true },
    orderBy: { createdAt: 'desc' },
    take: 4,
  });

  const recentDecisions = await prisma.analyticsEvent.findMany({
    where: { userId, eventType: { in: ['decision_viewed', 'recommendation_viewed'] } },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  const searchHistory = await prisma.searchHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  res.json({
    ...data,
    trendingProducts,
    wishlistItems: wishlistItems.map(i => ({
      id: i.id, productId: i.productId, product: i.product, addedAt: i.createdAt,
    })),
    recentDecisions: recentDecisions.map(d => ({
      type: d.eventType, productName: JSON.parse(d.data || '{}').productName || 'Unknown', date: d.createdAt,
    })),
    searchHistory: searchHistory.map(s => ({
      id: s.id, prompt: s.prompt, date: s.createdAt,
    })),
  });
});

module.exports = { getDashboard };
