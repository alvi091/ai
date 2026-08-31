/*
 * Analyze-URL controllers.
 *   POST /api/analyze  { url, prompt? }  -> report (sync) OR { jobId, status }
 *   GET  /api/analyze/:jobId             -> job status/progress/result
 *
 * Behavior:
 *   - Cache hit: return instantly (12h TTL).
 *   - Capacity available (inlineActive < INLINE_MAX): run inline, return result
 *     directly. The user sees no "queued" state — analysis starts immediately.
 *   - At capacity + Redis available: enqueue BullMQ job, return { jobId,
 *     status: "queued" }. The frontend polls GET /:jobId.
 *   - At capacity + no Redis: HTTP 429.
 */

const { analyzeUrl } = require('../services/analyzeUrlService');
const { readCache, writeCache, createJob, normalizeUrlForCache } = require('../services/jobQueue');
const { trackAnalysis } = require('../services/analyticsTracker');
const prisma = require('../database');

const INLINE_MAX = parseInt(process.env.ANALYZE_INLINE_MAX, 10) || 3;
const queueEnabled = Boolean(process.env.REDIS_URL) && process.env.ANALYZE_QUEUE_ENABLED !== 'false';
let inlineActive = 0;

function invalidUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return 'url is required';
  if (!/^(?:https?:\/\/)?\S+\.\S{2,}/i.test(url.trim())) return 'Please paste a valid product URL.';
  return null;
}

const analyzeUrlHandler = async (req, res, next) => {
  const t0 = Date.now();
  try {
    const body = req.body || {};
    const url = typeof body.url === 'string' ? body.url.trim() : '';
    const invalid = invalidUrl(url);
    if (invalid) return res.status(400).json({ error: invalid, ok: false, kind: 'validation' });

    const refresh = body.refresh === true || body.refresh === 'true' || req.query.refresh === 'true';
    const normalizedUrl = normalizeUrlForCache(url);
    const prompt = typeof body.prompt === 'string' && body.prompt.trim() ? body.prompt.trim() : null;

    // 1. Cache hit -> return instantly.
    if (!refresh) {
      const cached = await readCache(normalizedUrl);
      if (cached && cached.ok) {
        trackAnalysis({
          userId: req.user?.id || null,
          url,
          marketplace: cached.site?.id || null,
          status: 'completed',
          durationMs: Date.now() - t0,
          aiUsed: Boolean(cached.aiReport),
          cacheHit: true,
        });
        console.log(`[analyze] cache-hit ms=${Date.now() - t0} site=${cached.site && cached.site.id}`);
        return res.json({ ok: true, cached: true, ...cached });
      }
    }

    // 2. Capacity available -> run inline immediately (no "queued" state).
    if (inlineActive < INLINE_MAX) {
      inlineActive += 1;
      const startedAt = Date.now();
      try {
        const result = await analyzeUrl({ url, prompt });
        const durationMs = Date.now() - startedAt;
        if (result && result.ok) {
          await writeCache(normalizedUrl, result);
          trackAnalysis({
            userId: req.user?.id || null,
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
          trackAnalysis({
            userId: req.user?.id || null,
            url,
            status: 'failed',
            startedAt: new Date(startedAt),
            completedAt: new Date(),
            durationMs,
            failureCategory: result?.error || 'unknown',
          });
        }
        console.log(`[analyze] inline ms=${durationMs} site=${result && result.site && result.site.id} ok=${Boolean(result && result.ok)}`);
        return res.json(result);
      } finally {
        inlineActive -= 1;
      }
    }

    // 3. At capacity -> queue if Redis available, else 429.
    if (queueEnabled) {
      try {
        const jobId = await createJob({ url, normalizedUrl, prompt });
        console.log(`[analyze] queued job=${jobId} ms=${Date.now() - t0} active=${inlineActive}`);
        return res.json({ ok: true, queued: true, jobId, status: 'queued', requestedUrl: url });
      } catch (err) {
        console.error('[analyze] queue enqueue failed:', err && err.message);
      }
    }

    // 4. No capacity, no queue -> 429.
    console.log(`[analyze] busy-429 ms=${Date.now() - t0} active=${inlineActive}`);
    return res.status(429).json({
      ok: false,
      kind: 'busy',
      error: 'We are processing too many analyses right now — please retry in a few seconds.',
    });
  } catch (err) {
    return next(err);
  }
};

const getJobHandler = async (req, res) => {
  try {
    const jobId = String(req.params.jobId || '');
    const job = await prisma.analysisJob.findUnique({ where: { id: jobId } });
    if (!job) return res.status(404).json({ error: 'Job not found', ok: false });

    return res.json({
      ok: true,
      jobId: job.id,
      status: job.status,
      progress: job.progress || [],
      result: job.result || null,
      error: job.error || null,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message, ok: false });
  }
};

module.exports = { analyzeUrl: analyzeUrlHandler, getJob: getJobHandler };
