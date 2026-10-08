/*
 * Worker task endpoints — invoked by Cloud Tasks (or the API directly).
 *
 *   POST /tasks/analyze  { jobId, url, normalizedUrl, prompt? }
 *   GET  /tasks/health
 *
 * Auth: keep the worker service private (--no-allow-unauthenticated) and let
 * Cloud Tasks authenticate with an OIDC token. Optionally set
 * TASKS_SHARED_SECRET and send it as x-tasks-secret for an extra check.
 */

const express = require('express');
const { analyzeUrl } = require('../services/analyzeUrlService');
const { writeCache, normalizeUrlForCache } = require('../services/jobQueue');
const { trackAnalysis } = require('../services/analyticsTracker');
const prisma = require('../database');

const router = express.Router();

const GLOBAL_MAX = parseInt(process.env.ANALYZE_GLOBAL_MAX, 10) || 8;
const SHARED_SECRET = process.env.TASKS_SHARED_SECRET || '';

let active = 0;

router.use((req, res, next) => {
  if (SHARED_SECRET && req.get('x-tasks-secret') !== SHARED_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
});

router.get('/health', (req, res) => {
  res.json({ status: 'ok', active, max: GLOBAL_MAX, uptime: Math.round(process.uptime()) });
});

router.post('/analyze', async (req, res) => {
  const body = req.body || {};
  const url = typeof body.url === 'string' ? body.url.trim() : '';
  const jobId = body.jobId ? String(body.jobId) : null;
  const prompt = typeof body.prompt === 'string' && body.prompt.trim() ? body.prompt.trim() : null;
  const normalizedUrl = body.normalizedUrl || normalizeUrlForCache(url);

  if (!url) return res.status(400).json({ error: 'url is required' });

  // Reject instead of queueing in-process: Cloud Tasks retries on non-2xx.
  if (active >= GLOBAL_MAX) {
    if (jobId) {
      await prisma.analysisJob.update({ where: { id: jobId }, data: { status: 'queued' } }).catch(() => {});
    }
    return res.status(429).json({ error: 'worker saturated' });
  }

  active += 1;
  const startedAt = Date.now();
  const mark = (data) => (jobId ? prisma.analysisJob.update({ where: { id: jobId }, data }).catch(() => {}) : null);

  try {
    await mark({ status: 'running' });

    const result = await analyzeUrl({ url, prompt });
    const durationMs = Date.now() - startedAt;

    if (result && result.ok) {
      await writeCache(normalizedUrl, result);
      await mark({ status: 'completed', result, progress: result.progress || [] });
      trackAnalysis({
        userId: null,
        url,
        marketplace: result.site?.id || null,
        status: 'completed',
        startedAt: new Date(startedAt),
        completedAt: new Date(),
        durationMs,
        aiUsed: Boolean(result.aiReport),
        cacheHit: false,
      });
    } else {
      await mark({ status: 'failed', error: result?.error || 'unknown', progress: result?.progress || [] });
      trackAnalysis({
        userId: null,
        url,
        status: 'failed',
        startedAt: new Date(startedAt),
        completedAt: new Date(),
        durationMs,
        failureCategory: result?.error || 'unknown',
      });
    }

    console.log(`[worker] analyze job=${jobId || '-'} ms=${durationMs} ok=${Boolean(result && result.ok)}`);
    return res.json({ ok: Boolean(result && result.ok), jobId });
  } catch (err) {
    console.error('[worker] analyze failed:', err && err.message);
    await mark({ status: 'failed', error: err.message });
    // 500 -> Cloud Tasks retries with backoff.
    return res.status(500).json({ error: err.message });
  } finally {
    active -= 1;
  }
});

module.exports = router;
