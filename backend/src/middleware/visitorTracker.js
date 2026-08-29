const prisma = require('../database');
const crypto = require('crypto');

function parseUserAgent(ua) {
  if (!ua) return { device: 'Unknown', browser: 'Unknown', os: 'Unknown' };

  let device = 'Desktop';
  if (/mobile|android|iphone|ipad/i.test(ua)) device = /ipad|tablet/i.test(ua) ? 'Tablet' : 'Mobile';

  let browser = 'Other';
  if (/chrome/i.test(ua) && !/edge|opr/i.test(ua)) browser = 'Chrome';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/edge/i.test(ua)) browser = 'Edge';
  else if (/opr|opera/i.test(ua)) browser = 'Opera';

  let os = 'Other';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';

  return { device, browser, os };
}

function getVisitorId(req) {
  let vid = req.headers['x-visitor-id'];
  if (vid) return vid;

  const ip = req.ip || req.connection?.remoteAddress || '';
  const ua = req.headers['user-agent'] || '';
  vid = crypto.createHash('sha256').update(`${ip}:${ua}`).digest('hex').slice(0, 32);
  return vid;
}

async function trackVisitor(req, res, next) {
  if (req.path.startsWith('/api/') || req.path === '/api/health') return next();

  try {
    const visitorId = getVisitorId(req);
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || '';
    const ua = req.headers['user-agent'] || '';
    const referrer = req.headers['referer'] || req.headers['referrer'] || '';
    const path = req.path === '/' ? '/' : req.path.replace(/\/+$/, '');
    const { device, browser, os } = parseUserAgent(ua);
    const userId = req.user?.id || null;

    const existing = await prisma.visitor.findFirst({ where: { visitorId } });
    const isUnique = !existing;

    prisma.visitor.create({
      data: { visitorId, userId, ip, userAgent: ua, referrer, path, device, browser, os, isUnique },
    }).catch(() => {});

    prisma.pageView.create({
      data: { visitorId, userId, path, referrer },
    }).catch(() => {});
  } catch (_) {}

  next();
}

module.exports = { trackVisitor };
