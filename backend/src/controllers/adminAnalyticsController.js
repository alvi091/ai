const prisma = require('../database');

function dateFilter(days) {
  if (!days || days === 'all') return {};
  const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);
  return { gte: since };
}

function parseRange(req) {
  const { days = 30, from, to } = req.query;
  if (from && to) {
    return { gte: new Date(from), lte: new Date(to) };
  }
  return dateFilter(days);
}

function parsePagination(req) {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

const getDashboard = async (req, res) => {
  const range = parseRange(req);
  const createdAtFilter = Object.keys(range).length ? { createdAt: range } : {};

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsersToday,
    newUsersWeek,
    newUsersMonth,
    totalAnalyses,
    analysesToday,
    analysesWeek,
    analysesMonth,
    successfulAnalyses,
    failedAnalyses,
    totalSearches,
    searchesToday,
    totalComparisons,
    totalWishlists,
    uniqueVisitors,
    totalAIRequests,
    avgDurationResult,
    errorCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
    prisma.analyticsEvent.count({ where: { eventType: { startsWith: 'analysis_' }, ...createdAtFilter } }),
    prisma.analyticsEvent.count({ where: { eventType: { startsWith: 'analysis_' }, createdAt: { gte: todayStart } } }),
    prisma.analyticsEvent.count({ where: { eventType: { startsWith: 'analysis_' }, createdAt: { gte: weekAgo } } }),
    prisma.analyticsEvent.count({ where: { eventType: { startsWith: 'analysis_' }, createdAt: { gte: monthAgo } } }),
    prisma.analyticsEvent.count({ where: { eventType: 'analysis_completed', ...createdAtFilter } }),
    prisma.analyticsEvent.count({ where: { eventType: 'analysis_failed', ...createdAtFilter } }),
    prisma.analyticsEvent.count({ where: { eventType: 'search', ...createdAtFilter } }),
    prisma.analyticsEvent.count({ where: { eventType: 'search', createdAt: { gte: todayStart } } }),
    prisma.analyticsEvent.count({ where: { eventType: 'comparison', ...createdAtFilter } }),
    prisma.analyticsEvent.count({ where: { eventType: 'wishlist_add', ...createdAtFilter } }),
    prisma.visitor.count().catch(() => 0),
    prisma.analyticsEvent.count({ where: { eventType: { startsWith: 'ai_' }, ...createdAtFilter } }),
    prisma.analyticsEvent.findMany({
      where: { eventType: 'analysis_completed', ...createdAtFilter },
      select: { data: true },
      take: 1000,
    }).then(events => {
      const durations = [];
      events.forEach(e => {
        try { const d = JSON.parse(e.data || '{}'); if (d.durationMs) durations.push(d.durationMs); } catch {}
      });
      return durations.length ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : 0;
    }),
    prisma.systemError.count().catch(() => 0),
  ]);

  const days = parseInt(req.query.days) || 30;
  const dailyAnalyses = [];
  const dailyVisitors = [];
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);
    dailyAnalyses.push({ date: dayStart.toISOString().split('T')[0], count: 0 });
    dailyVisitors.push({ date: dayStart.toISOString().split('T')[0], count: 0 });
  }

  const analysisEvents = await prisma.analyticsEvent.findMany({
    where: { eventType: { startsWith: 'analysis_' }, ...createdAtFilter },
    select: { createdAt: true },
  });
  analysisEvents.forEach(e => {
    const day = e.createdAt.toISOString().split('T')[0];
    const bucket = dailyAnalyses.find(d => d.date === day);
    if (bucket) bucket.count++;
  });

  const visitorEvents = await prisma.visitor.findMany({
    where: Object.keys(range).length ? { createdAt: range } : {},
    select: { createdAt: true },
  }).catch(() => []);
  visitorEvents.forEach(e => {
    const day = e.createdAt.toISOString().split('T')[0];
    const bucket = dailyVisitors.find(d => d.date === day);
    if (bucket) bucket.count++;
  });

  res.json({
    totalAnalyses,
    analysesToday,
    analysesWeek,
    analysesMonth,
    successfulAnalyses,
    failedAnalyses,
    successRate: totalAnalyses > 0 ? Math.round((successfulAnalyses / totalAnalyses) * 100) : 0,
    totalUsers,
    newUsersToday,
    newUsersWeek,
    newUsersMonth,
    uniqueVisitors,
    totalAIRequests,
    avgDurationMs: avgDurationResult,
    errorCount,
    totalSearches,
    searchesToday,
    totalComparisons,
    totalWishlists,
    dailyAnalyses,
    dailyVisitors,
  });
};

const getUsers = async (req, res) => {
  const { page, limit, skip } = parsePagination(req);
  const range = parseRange(req);
  const { search } = req.query;

  const where = {};
  if (Object.keys(range).length) {
    where.createdAt = range;
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, email: true, role: true, createdAt: true,
        _count: { select: { searchHistory: true, wishlist: true, analyticsEvents: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const userIds = users.map(u => u.id);
  const lastActivities = await prisma.analyticsEvent.groupBy({
    by: ['userId'],
    where: { userId: { in: userIds } },
    _max: { createdAt: true },
  });
  const lastActivityMap = {};
  lastActivities.forEach(a => { lastActivityMap[a.userId] = a._max.createdAt; });

  res.json({
    users: users.map(u => ({
      ...u,
      lastActive: lastActivityMap[u.id] || null,
      totalAnalyses: u._count.analyticsEvents,
      totalSearches: u._count.searchHistory,
      totalWishlist: u._count.wishlist,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
};

const getUserDetail = async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true,
      _count: { select: { searchHistory: true, wishlist: true, analyticsEvents: true, comparisons: true } },
    },
  });

  if (!user) return res.status(404).json({ error: 'User not found' });

  const [events, searches, lastActivity] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: ['eventType'],
      where: { userId: id },
      _count: true,
    }),
    prisma.searchHistory.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, prompt: true, createdAt: true },
    }),
    prisma.analyticsEvent.findFirst({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, eventType: true },
    }),
  ]);

  res.json({
    user,
    eventBreakdown: events,
    recentSearches: searches,
    lastActivity: lastActivity?.createdAt || null,
  });
};

const getAnalyses = async (req, res) => {
  const { page, limit, skip } = parsePagination(req);
  const range = parseRange(req);
  const { status, marketplace } = req.query;

  const where = { eventType: { startsWith: 'analysis_' } };
  if (Object.keys(range).length) where.createdAt = range;
  if (status) where.eventType = 'analysis_' + status;

  const [events, total] = await Promise.all([
    prisma.analyticsEvent.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, eventType: true, data: true, createdAt: true, userId: true },
    }),
    prisma.analyticsEvent.count({ where }),
  ]);

  const parsed = events.map(e => {
    let d = {};
    try { d = JSON.parse(e.data || '{}'); } catch {}
    return { ...e, parsed: d };
  });

  if (marketplace) {
    const filtered = parsed.filter(e => e.parsed.marketplace === marketplace);
    return res.json({ analyses: filtered, total: filtered.length, pagination: { page, limit, total: filtered.length, totalPages: Math.ceil(filtered.length / limit) } });
  }

  res.json({
    analyses: parsed,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
};

const getMarketplaceStats = async (req, res) => {
  const range = parseRange(req);
  const createdAtFilter = Object.keys(range).length ? { createdAt: range } : {};

  const allEvents = await prisma.analyticsEvent.findMany({
    where: { eventType: { startsWith: 'analysis_' }, ...createdAtFilter },
    select: { eventType: true, data: true },
    take: 50000,
  });

  const marketplaces = {};
  const supportedMarketplaces = ['Amazon', 'Flipkart', 'Myntra', 'Meesho', 'AJIO'];

  supportedMarketplaces.forEach(mp => {
    marketplaces[mp] = { name: mp, total: 0, completed: 0, failed: 0, blocked: 0, durations: [] };
  });

  allEvents.forEach(e => {
    let d = {};
    try { d = JSON.parse(e.data || '{}'); } catch {}
    const mp = d.marketplace;
    if (!mp || !marketplaces[mp]) return;

    const status = e.eventType.replace('analysis_', '');
    marketplaces[mp].total++;
    if (status === 'completed') {
      marketplaces[mp].completed++;
      if (d.durationMs) marketplaces[mp].durations.push(d.durationMs);
    } else if (status === 'failed') {
      marketplaces[mp].failed++;
      if (d.failureCategory === 'marketplace_blocked') marketplaces[mp].blocked++;
    }
  });

  const result = Object.values(marketplaces).map(mp => {
    const durations = mp.durations.sort((a, b) => a - b);
    const avg = durations.length ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : 0;
    const p95 = durations.length ? durations[Math.floor(durations.length * 0.95)] : 0;
    return {
      name: mp.name,
      total: mp.total,
      completed: mp.completed,
      failed: mp.failed,
      blocked: mp.blocked,
      avgDuration: avg,
      p95Duration: p95,
      successRate: mp.total > 0 ? Math.round((mp.completed / mp.total) * 100) : 0,
    };
  });

  res.json(result);
};

const getAIUsage = async (req, res) => {
  const range = parseRange(req);
  const createdAtFilter = Object.keys(range).length ? { createdAt: range } : {};

  const [total, byType, recentWithDurations] = await Promise.all([
    prisma.analyticsEvent.count({ where: { eventType: { startsWith: 'ai_' }, ...createdAtFilter } }),
    prisma.analyticsEvent.groupBy({
      by: ['eventType'],
      where: { eventType: { startsWith: 'ai_' }, ...createdAtFilter },
      _count: true,
    }),
    prisma.analyticsEvent.findMany({
      where: { eventType: { startsWith: 'ai_' }, ...createdAtFilter },
      select: { data: true },
      take: 1000,
    }),
  ]);

  const durations = [];
  let successCount = 0;
  let failCount = 0;

  recentWithDurations.forEach(e => {
    let d = {};
    try { d = JSON.parse(e.data || '{}'); } catch {}
    if (d.durationMs) durations.push(d.durationMs);
    if (d.success === false) failCount++;
    else successCount++;
  });

  durations.sort((a, b) => a - b);
  const avgDuration = durations.length ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : 0;
  const p50 = durations.length ? durations[Math.floor(durations.length * 0.5)] : 0;
  const p95 = durations.length ? durations[Math.floor(durations.length * 0.95)] : 0;

  const daily = [];
  const now = new Date();
  const days = parseInt(req.query.days) || 30;
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);
    daily.push({ date: dayStart.toISOString().split('T')[0], count: 0 });
  }

  const aiEvents = await prisma.analyticsEvent.findMany({
    where: { eventType: { startsWith: 'ai_' }, ...createdAtFilter },
    select: { createdAt: true },
  });
  aiEvents.forEach(e => {
    const day = e.createdAt.toISOString().split('T')[0];
    const bucket = daily.find(d => d.date === day);
    if (bucket) bucket.count++;
  });

  res.json({
    total,
    success: successCount,
    failed: failCount,
    avgDuration,
    p50Duration: p50,
    p95Duration: p95,
    byModel: byType.map(t => ({ model: t.eventType, count: t._count, avgDurationMs: avgDuration })),
    daily,
  });
};

const getErrors = async (req, res) => {
  const { page, limit, skip } = parsePagination(req);
  const range = parseRange(req);
  const { category } = req.query;

  const where = {};
  if (Object.keys(range).length) where.createdAt = range;
  if (category) where.category = category;

  const [errors, total, byCategory] = await Promise.all([
    prisma.systemError.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, endpoint: true, category: true, marketplace: true, statusCode: true, message: true, createdAt: true },
    }),
    prisma.systemError.count({ where }),
    prisma.systemError.groupBy({
      by: ['category'],
      where,
      _count: true,
      orderBy: { _count: { category: 'desc' } },
    }),
  ]);

  res.json({
    errors,
    byCategory,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
};

const getRetention = async (req, res) => {
  const now = new Date();
  const day1 = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const day7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    usersDay1,
    usersDay7,
    usersDay30,
    usersWith2Analyses,
    usersWith5Analyses,
    totalUsers,
  ] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: day1 }, userId: { not: null }, eventType: { startsWith: 'analysis_' } },
    }).then(r => r.length),
    prisma.analyticsEvent.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: day7 }, userId: { not: null }, eventType: { startsWith: 'analysis_' } },
    }).then(r => r.length),
    prisma.analyticsEvent.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: day30 }, userId: { not: null }, eventType: { startsWith: 'analysis_' } },
    }).then(r => r.length),
    prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM (
        SELECT "userId" FROM "AnalyticsEvent"
        WHERE "userId" IS NOT NULL AND "eventType" LIKE 'analysis_%'
        GROUP BY "userId" HAVING COUNT(*) >= 2
      ) sub
    `.then(r => r[0]?.count || 0),
    prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM (
        SELECT "userId" FROM "AnalyticsEvent"
        WHERE "userId" IS NOT NULL AND "eventType" LIKE 'analysis_%'
        GROUP BY "userId" HAVING COUNT(*) >= 5
      ) sub
    `.then(r => r[0]?.count || 0),
    prisma.user.count(),
  ]);

  res.json({
    dau: { active: usersDay1 },
    wau: { active: usersDay7 },
    mau: { active: usersDay30 },
    retention: {
      day1: totalUsers > 0 ? Math.round((usersDay1 / totalUsers) * 100) : 0,
      day7: totalUsers > 0 ? Math.round((usersDay7 / totalUsers) * 100) : 0,
      day30: totalUsers > 0 ? Math.round((usersDay30 / totalUsers) * 100) : 0,
    },
    repeatUsers: {
      twoPlus: usersWith2Analyses,
      fivePlus: usersWith5Analyses,
    },
    totalUsers,
  });
};

const getActivity = async (req, res) => {
  const { limit = 30 } = req.query;
  const events = await prisma.analyticsEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: Math.min(100, parseInt(limit)),
    select: { id: true, eventType: true, data: true, createdAt: true, userId: true },
  });

  const userIds = [...new Set(events.map(e => e.userId).filter(Boolean))];
  const users = userIds.length ? await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  }) : [];
  const userMap = {};
  users.forEach(u => { userMap[u.id] = u.name || u.email; });

  res.json(events.map(e => ({
    id: e.id,
    type: e.eventType,
    user: e.userId ? (userMap[e.userId] || 'Unknown') : 'System',
    createdAt: e.createdAt,
  })));
};

const getDecisionStats = async (req, res) => {
  const range = parseRange(req);
  const createdAtFilter = Object.keys(range).length ? { createdAt: range } : {};

  const events = await prisma.analyticsEvent.findMany({
    where: { eventType: 'decision_viewed', ...createdAtFilter },
    select: { data: true },
    take: 50000,
  });

  const verdicts = { BUY_NOW: 0, WAIT: 0, NOT_RECOMMENDED: 0, other: 0 };
  events.forEach(e => {
    let d = {};
    try { d = JSON.parse(e.data || '{}'); } catch {}
    const v = d.verdict || d.decision || '';
    if (v === 'BUY_NOW') verdicts.BUY_NOW++;
    else if (v === 'WAIT') verdicts.WAIT++;
    else if (v === 'NOT_RECOMMENDED') verdicts.NOT_RECOMMENDED++;
    else verdicts.other++;
  });

  const total = verdicts.BUY_NOW + verdicts.WAIT + verdicts.NOT_RECOMMENDED + verdicts.other;
  res.json({
    total,
    decisions: [
      { verdict: 'BUY_NOW', count: verdicts.BUY_NOW },
      { verdict: 'WAIT', count: verdicts.WAIT },
      { verdict: 'NOT_RECOMMENDED', count: verdicts.NOT_RECOMMENDED },
      { verdict: 'Other', count: verdicts.other },
    ],
    buyPercent: total > 0 ? Math.round((verdicts.BUY_NOW / total) * 100) : 0,
    waitPercent: total > 0 ? Math.round((verdicts.WAIT / total) * 100) : 0,
    avoidPercent: total > 0 ? Math.round((verdicts.NOT_RECOMMENDED / total) * 100) : 0,
  });
};

const getTopProducts = async (req, res) => {
  const range = parseRange(req);
  const createdAtFilter = Object.keys(range).length ? { createdAt: range } : {};

  const events = await prisma.analyticsEvent.findMany({
    where: { eventType: { startsWith: 'analysis_' }, ...createdAtFilter },
    select: { data: true },
    take: 50000,
  });

  const categories = {};
  const marketplaces = {};

  events.forEach(e => {
    let d = {};
    try { d = JSON.parse(e.data || '{}'); } catch {}
    const mp = d.marketplace;
    if (mp) marketplaces[mp] = (marketplaces[mp] || 0) + 1;
    const cat = d.category;
    if (cat) categories[cat] = (categories[cat] || 0) + 1;
  });

  const topCategories = Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([name, count]) => ({ name, count }));

  const topMarketplaces = Object.entries(marketplaces)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  res.json({ products: topCategories.map(c => ({ name: c.name, count: c.count, marketplace: null, lastAnalyzed: null })), topMarketplaces });
};

module.exports = {
  getDashboard,
  getUsers,
  getUserDetail,
  getAnalyses,
  getMarketplaceStats,
  getAIUsage,
  getErrors,
  getRetention,
  getActivity,
  getDecisionStats,
  getTopProducts,
};
