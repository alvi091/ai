const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const searchRoutes = require('./routes/search');
const wishlistRoutes = require('./routes/wishlist');
const compareRoutes = require('./routes/compare');
const buyAnalysisRoutes = require('./routes/buyAnalysis');
const decisionRoutes = require('./routes/decision');
const reviewRoutes = require('./routes/reviews');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');
const amazonRoutes = require('./routes/amazon');
const analyzeRoutes = require('./routes/analyze');
const chatRoutes = require('./routes/chat');
const marketplaceRoutes = require('./routes/marketplace');
const researchRoutes = require('./routes/research');
const visitorRoutes = require('./routes/visitors');
const { trackVisitor } = require('./middleware/visitorTracker');

const app = express();

app.use(helmet());
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (config.nodeEnv === 'production') {
  // Health checks (Render's monitor + CDN probes) must never be throttled.
  const skipHealth = (req) => req.path === '/api/health';
  let limiter;
  try {
    if (process.env.REDIS_URL) {
      const { RedisStore } = require('rate-limit-redis');
      const { Redis } = require('ioredis');
      const redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1 });
      limiter = rateLimit({
        windowMs: config.rateLimit.windowMs,
        max: config.rateLimit.max,
        standardHeaders: true,
        legacyHeaders: false,
        skip: skipHealth,
        store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
        message: { error: 'Too many requests, please try again later' },
      });
    } else {
      throw new Error('REDIS_URL missing');
    }
  } catch {
    limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      skip: skipHealth,
      message: { error: 'Too many requests, please try again later' },
    });
  }
  app.use(limiter);
}

app.get('/api/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
    version: process.env.npm_package_version || '1.0.0',
  };
  if (req.query.detailed === 'true') {
    health.env = process.env.NODE_ENV || 'development';
    health.pid = process.pid;
  }
  res.json(health);
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/compare', compareRoutes);
app.use('/api/products/analyze', buyAnalysisRoutes);
app.use('/api/decision', decisionRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/amazon', amazonRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/research', researchRoutes);
app.use('/api/visitors', visitorRoutes);

// Track visitors BEFORE static serving so page visits are recorded
app.use(trackVisitor);

// Serve the built frontend (same-origin deployment) if it exists
const distDir = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use(errorHandler);

const start = async () => {
  try {
    const prisma = require('./database');
    await prisma.$connect();
    console.log('Database connected');

    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Visitor" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          "visitorId" TEXT NOT NULL,
          "userId" TEXT,
          "ip" TEXT,
          "userAgent" TEXT,
          "referrer" TEXT,
          "path" TEXT NOT NULL,
          "country" TEXT,
          "city" TEXT,
          "device" TEXT,
          "browser" TEXT,
          "os" TEXT,
          "isUnique" BOOLEAN DEFAULT true,
          "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS "Visitor_visitorId_idx" ON "Visitor"("visitorId");
        CREATE INDEX IF NOT EXISTS "Visitor_createdAt_idx" ON "Visitor"("createdAt");

        CREATE TABLE IF NOT EXISTS "PageView" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          "visitorId" TEXT NOT NULL,
          "userId" TEXT,
          "path" TEXT NOT NULL,
          "referrer" TEXT,
          "duration" INTEGER,
          "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS "PageView_visitorId_idx" ON "PageView"("visitorId");
        CREATE INDEX IF NOT EXISTS "PageView_createdAt_idx" ON "PageView"("createdAt");

        CREATE TABLE IF NOT EXISTS "SystemError" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          "userId" TEXT,
          "endpoint" TEXT NOT NULL,
          "category" TEXT NOT NULL,
          "marketplace" TEXT,
          "statusCode" INTEGER,
          "message" TEXT NOT NULL,
          "stack" TEXT,
          "metadata" TEXT,
          "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS "SystemError_category_idx" ON "SystemError"("category");
        CREATE INDEX IF NOT EXISTS "SystemError_createdAt_idx" ON "SystemError"("createdAt");
        CREATE INDEX IF NOT EXISTS "SystemError_marketplace_idx" ON "SystemError"("marketplace");
      `);
      console.log('Visitor/PageView/SystemError tables verified');
    } catch (e) {
      console.error('[startup] Table creation failed:', e.message);
    }

    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();

module.exports = app;
