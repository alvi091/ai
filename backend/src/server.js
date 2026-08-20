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

const app = express();

app.use(helmet());
app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (config.nodeEnv === 'production') {
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
      message: { error: 'Too many requests, please try again later' },
    });
  }
  app.use(limiter);
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
