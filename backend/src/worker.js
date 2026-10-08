/*
 * Background worker — Cloud Run service receiving Cloud Tasks pushes.
 *
 * Endpoints:
 *   POST /tasks/analyze  — runs analyzeUrlService + writes AnalysisJob/AnalysisCache
 *   GET  /tasks/health   — liveness/readiness
 *
 * Deploy with --no-allow-unauthenticated and point the Cloud Tasks queue's
 * HTTP target at this service (OIDC token from CLOUD_TASKS_OIDC_SA).
 * Set env: DATABASE_URL, GEMINI_API_KEY, CLOUD_TASKS_* (API side),
 * NODE_ENV=production, PORT (8080 on Cloud Run).
 */

require('dotenv').config();

const express = require('express');
const morgan = require('morgan');
const tasksRouter = require('./routes/tasks');
const { errorHandler } = require('./middleware/errorHandler');

const config = require('./config');

const app = express();
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => res.json({ service: 'ayymus-worker' }));
app.use('/tasks', tasksRouter);
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use(errorHandler);

const start = async () => {
  try {
    const prisma = require('./database');
    await prisma.$connect();
    console.log('[worker] DB connected — ready for Cloud Tasks jobs');

    app.listen(config.port, () => {
      console.log(`[worker] listening on port ${config.port} (env=${config.nodeEnv})`);
    });
  } catch (error) {
    console.error('[worker] failed to start:', error);
    process.exit(1);
  }
};

start();

module.exports = app;
