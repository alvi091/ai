const prisma = require('../database');

async function trackEvent(userId, eventType, data = {}) {
  try {
    await prisma.analyticsEvent.create({
      data: {
        userId: userId || null,
        eventType,
        data: JSON.stringify(data),
      },
    });
  } catch (e) {
    console.error('Analytics tracking error:', e.message);
  }
}

async function trackRecommendationClick(userId) {
  if (!userId) return;
  await prisma.shoppingInsight.upsert({
    where: { userId },
    create: { userId, recommendationClicks: 1 },
    update: { recommendationClicks: { increment: 1 } },
  });
}

async function trackSearch(userId) {
  if (!userId) return;
  await prisma.shoppingInsight.upsert({
    where: { userId },
    create: { userId, totalSearches: 1 },
    update: { totalSearches: { increment: 1 } },
  });
}

async function getDashboardData(userId) {
  if (!userId) return null;

  const insights = await prisma.shoppingInsight.findUnique({ where: { userId } });
  const memory = await prisma.aIMemory.findUnique({ where: { userId } });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { persona: true, name: true, email: true },
  });

  const recentDecisions = await prisma.analyticsEvent.findMany({
    where: { userId, eventType: { in: ['decision_made', 'recommendation_viewed'] } },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  const priceDropAlerts = await prisma.priceHistory.groupBy({
    by: ['productId'],
    _min: { price: true },
    _max: { price: true },
    orderBy: { _max: { price: 'desc' } },
    take: 5,
  });

  const wishlistValue = await prisma.wishlist.findMany({
    where: { userId },
    include: { product: { select: { price: true } } },
  });

  const totalWishlistValue = wishlistValue.reduce((sum, item) => sum + (item.product?.price || 0), 0);

  const accuracy = insights
    ? insights.totalDecisions > 0
      ? Math.round((insights.accurateDecisions / insights.totalDecisions) * 100)
      : 0
    : 0;

  return {
    insights: insights || { monthlySavings: 0, moneySaved: 0, wishlistValue: 0, recommendationClicks: 0, totalSearches: 0, comparisonUsage: 0 },
    totalWishlistValue,
    persona: user?.persona || null,
    decisionAccuracy: accuracy,
    recentDecisions: recentDecisions.map(d => ({ type: d.eventType, date: d.createdAt })),
    favoriteCategories: memory?.favoriteCategories?.split(',').filter(Boolean) || [],
  };
}

async function getAdminStats() {
  const [users, products, searches, comparisons, wishlists, events] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.searchHistory.count(),
    prisma.comparison.count(),
    prisma.wishlist.count(),
    prisma.analyticsEvent.findMany({ take: 1000, orderBy: { createdAt: 'desc' } }),
  ]);

  const decisionEvents = events.filter(e => e.eventType === 'decision_made');
  const clickEvents = events.filter(e => e.eventType === 'recommendation_click');

  const popularBrands = await prisma.product.groupBy({
    by: ['brand'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  const popularCategories = await prisma.product.groupBy({
    by: ['category'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  return {
    totalUsers: users,
    totalProducts: products,
    totalSearches: searches,
    totalComparisons: comparisons,
    totalWishlists: wishlists,
    totalDecisions: decisionEvents.length,
    totalClicks: clickEvents.length,
    popularBrands: popularBrands.map(b => ({ name: b.brand, count: b._count.id })),
    popularCategories: popularCategories.map(c => ({ name: c.category, count: c._count.id })),
  };
}

module.exports = { trackEvent, trackRecommendationClick, trackSearch, getDashboardData, getAdminStats };
