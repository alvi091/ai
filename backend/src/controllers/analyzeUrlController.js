/*
 * Analyze-URL controllers.
 *   POST /api/analyze  { url, prompt? }  -> report (sync) OR { jobId } (queued)
 *   GET  /api/analyze/:jobId             -> queued job status/progress/result
 *
 * Behavior by environment:
 *   - Production (REDIS_URL set): enqueues a BullMQ job and returns { jobId };
 *     the frontend polls GET /:jobId. The heavy crawl + render + LLM runs in the
 *     worker fleet, so bursts back up in the queue instead of OOM the API.
 *   - Repeat hits: served instantly from AnalysisCache (12h TTL).
 *   - No Redis (local dev): runs inline with a hard concurrency cap; saturated
 *     requests get HTTP 429 instead of unbounded parallel crawls.
 *
 * Every submission logs a cache-hit / fresh line so repeat-vs-novel traffic can
 * be measured after launch and worker instances sized accordingly.
 */

const { analyzeUrl } = require('../services/analyzeUrlService');
const { readCache, writeCache, createJob, normalizeUrlForCache } = require('../services/jobQueue');
const prisma = require('../database');

const useQueue = Boolean(process.env.REDIS_URL) && process.env.ANALYZE_QUEUE_ENABLED !== 'false';
const INLINE_MAX = parseInt(process.env.ANALYZE_INLINE_MAX, 10) || 3;
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

    // Cache hit -> return instantly without re-crawling the same URL (unless a
    // refresh was requested, or the entry has aged past its TTL).
    if (!refresh) {
      const cached = await readCache(normalizedUrl);
      if (cached && cached.ok) {
        console.log(`[analyze] cache-hit ms=${Date.now() - t0} site=${cached.site && cached.site.id}`);
        return res.json({ ok: true, cached: true, ...cached });
      }
    }

    // Queue path (production): enqueue and hand the frontend a jobId to poll.
    if (useQueue) {
      try {
        const jobId = await createJob({
          url,
          normalizedUrl,
          prompt: typeof body.prompt === 'string' && body.prompt.trim() ? body.prompt.trim() : null,
        });
        console.log(`[analyze] queued job=${jobId} ms=${Date.now() - t0}`);
        return res.json({ ok: true, queued: true, jobId, requestedUrl: url });
      } catch (err) {
        console.error('[analyze] queue enqueue failed — falling back to inline:', err && err.message);
      }
    }

    // Inline path (fallback / local dev) — bound concurrency so bursts can't OOM.
    if (inlineActive >= INLINE_MAX) {
      console.log(`[analyze] busy-429 ms=${Date.now() - t0} active=${inlineActive}`);
      return res.status(429).json({
        ok: false,
        kind: 'busy',
        error: 'We are processing too many analyses right now — please retry in a few seconds.',
      });
    }

    inlineActive += 1;
    try {
      const result = await analyzeUrl({
        url,
        prompt: typeof body.prompt === 'string' && body.prompt.trim() ? body.prompt.trim() : null,
      });

      if (result && result.ok) {
        await writeCache(normalizedUrl, result);
      }
      console.log(`[analyze] freshly-crawled-inline ms=${Date.now() - t0} site=${result && result.site && result.site.id} ok=${Boolean(result && result.ok)}`);
      return res.json(result);
    } finally {
      inlineActive -= 1;
    }
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