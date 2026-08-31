const express = require('express');
const router = express.Router();
const prisma = require('../database');
const { asyncHandler } = require('../utils/asyncHandler');

const getVisitorStats = asyncHandler(async (req, res) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalVisitors,
    uniqueVisitors,
    todayVisitors,
    todayUnique,
    weekVisitors,
    weekUnique,
    monthVisitors,
    monthUnique,
    totalPageViews,
    todayPageViews,
  ] = await Promise.all([
    prisma.visitor.count(),
    prisma.visitor.findMany({ select: { visitorId: true }, distinct: ['visitorId'] }).then(r => r.length),
    prisma.visitor.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.visitor.findMany({ where: { createdAt: { gte: todayStart } }, select: { visitorId: true }, distinct: ['visitorId'] }).then(r => r.length),
    prisma.visitor.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.visitor.findMany({ where: { createdAt: { gte: weekAgo } }, select: { visitorId: true }, distinct: ['visitorId'] }).then(r => r.length),
    prisma.visitor.count({ where: { createdAt: { gte: monthAgo } } }),
    prisma.visitor.findMany({ where: { createdAt: { gte: monthAgo } }, select: { visitorId: true }, distinct: ['visitorId'] }).then(r => r.length),
    prisma.pageView.count(),
    prisma.pageView.count({ where: { createdAt: { gte: todayStart } } }),
  ]);

  const returningVisitors = totalVisitors - uniqueVisitors;

  res.json({
    total: { visits: totalVisitors, unique: uniqueVisitors, returning: Math.max(0, returningVisitors), pageViews: totalPageViews },
    today: { visits: todayVisitors, unique: todayUnique, pageViews: todayPageViews },
    thisWeek: { visits: weekVisitors, unique: weekUnique },
    thisMonth: { visits: monthVisitors, unique: monthUnique },
  });
});

const getVisitorTimeline = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

  const raw = await prisma.$queryRaw`
    SELECT
      DATE("createdAt") as date,
      COUNT(*)::int as "totalVisits",
      COUNT(DISTINCT "visitorId")::int as "uniqueVisitors"
    FROM "Visitor"
    WHERE "createdAt" >= ${since}
    GROUP BY DATE("createdAt")
    ORDER BY date ASC
  `;

  res.json(raw.map(r => ({
    date: r.date,
    totalVisits: r.totalVisits,
    uniqueVisitors: r.uniqueVisitors,
  })));
});

const getVisitorPages = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

  const pages = await prisma.pageView.groupBy({
    by: ['path'],
    _count: { id: true },
    where: { createdAt: { gte: since } },
    orderBy: { _count: { id: 'desc' } },
    take: 20,
  });

  res.json(pages.map(p => ({ path: p.path, views: p._count.id })));
});

const getVisitorReferrers = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

  const refs = await prisma.visitor.groupBy({
    by: ['referrer'],
    _count: { id: true },
    where: { createdAt: { gte: since }, referrer: { not: '' } },
    orderBy: { _count: { id: 'desc' } },
    take: 15,
  });

  res.json(refs.map(r => ({
    referrer: r.referrer || 'Direct',
    visits: r._count.id,
  })));
});

const getVisitorDevices = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

  const [devices, browsers, osList] = await Promise.all([
    prisma.visitor.groupBy({ by: ['device'], _count: { id: true }, where: { createdAt: { gte: since } }, orderBy: { _count: { id: 'desc' } } }),
    prisma.visitor.groupBy({ by: ['browser'], _count: { id: true }, where: { createdAt: { gte: since } }, orderBy: { _count: { id: 'desc' } } }),
    prisma.visitor.groupBy({ by: ['os'], _count: { id: true }, where: { createdAt: { gte: since } }, orderBy: { _count: { id: 'desc' } } }),
  ]);

  res.json({
    devices: devices.map(d => ({ name: d.device || 'Unknown', count: d._count.id })),
    browsers: browsers.map(b => ({ name: b.browser || 'Unknown', count: b._count.id })),
    operatingSystems: osList.map(o => ({ name: o.os || 'Unknown', count: o._count.id })),
  });
});

const getRecentVisitors = asyncHandler(async (req, res) => {
  const { limit = 50 } = req.query;
  const visitors = await prisma.visitor.findMany({
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit),
    select: {
      id: true, visitorId: true, path: true, referrer: true, device: true, browser: true, os: true, isUnique: true, createdAt: true,
    },
  });

  res.json(visitors.map(v => ({
    id: v.id,
    visitorId: v.visitorId,
    userName: 'Guest',
    path: v.path,
    referrer: v.referrer || 'Direct',
    device: v.device,
    browser: v.browser,
    os: v.os,
    isUnique: v.isUnique,
    timestamp: v.createdAt,
  })));
});

const getHourlyTraffic = asyncHandler(async (req, res) => {
  const { days = 7 } = req.query;
  const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

  const raw = await prisma.$queryRaw`
    SELECT
      DATE("createdAt") as date,
      EXTRACT(HOUR FROM "createdAt")::int as hour,
      COUNT(*)::int as "visits",
      COUNT(DISTINCT "visitorId")::int as "uniqueVisitors"
    FROM "Visitor"
    WHERE "createdAt" >= ${since}
    GROUP BY DATE("createdAt"), EXTRACT(HOUR FROM "createdAt")
    ORDER BY date ASC, hour ASC
  `;

  res.json(raw.map(r => ({
    date: r.date,
    hour: r.hour,
    visits: r.visits,
    uniqueVisitors: r.uniqueVisitors,
  })));
});

router.get('/stats', getVisitorStats);
router.get('/timeline', getVisitorTimeline);
router.get('/pages', getVisitorPages);
router.get('/referrers', getVisitorReferrers);
router.get('/devices', getVisitorDevices);
router.get('/recent', getRecentVisitors);
router.get('/hourly', getHourlyTraffic);

router.post('/track', asyncHandler(async (req, res) => {
  const { visitorId, path, referrer, device, browser, os, isFirstVisit } = req.body;
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '';

  try {
    if (isFirstVisit) {
      const existing = await prisma.visitor.findFirst({ where: { visitorId } });
      const isUnique = !existing;

      await prisma.visitor.create({
        data: { visitorId, ip, userAgent: req.headers['user-agent'] || '', referrer: referrer || '', path: path || '/', device, browser, os, isUnique },
      });
    }

    await prisma.pageView.create({
      data: { visitorId, path: path || '/', referrer: referrer || '' },
    });
  } catch (e) {
    console.error('[visitors/track] error:', e.message);
  }

  res.json({ ok: true });
}));

module.exports = router;
