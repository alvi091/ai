/*
 * Analysis job queue — BullMQ producer/worker wiring for the URL analyzer.
 *
 * The web API enqueues jobs here and returns a jobId; a separate worker process
 * (src/worker.js) drains the queue with a small concurrency cap so incoming
 * "analyze this URL" requests never block or OOM the API service.
 */

const { Queue, Worker } = require('bullmq');
const prisma = require('../database');

const connection = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
};

const QUEUE_NAME = 'url-analysis';
const QUEUE_CONCURRENCY = parseInt(process.env.ANALYZE_WORKER_CONCURRENCY, 10) || 5;
// Cached reports are only served fresh within this window; older entries are
// re-crawled on the next hit so review counts stay current (Flipkart's API
// slate changes, and an earlier weak snapshot must not be served forever).
const CACHE_TTL_MS = parseInt(process.env.ANALYSIS_CACHE_TTL_MS, 10) || 12 * 60 * 60 * 1000;

const queue = new Queue(QUEUE_NAME, { connection });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/*
 * Distributed analyze gate — a shared Redis active-counter that caps how many
 * heavy crawl+render analyses run at once across ALL worker instances.
 * BullMQ's per-instance `concurrency` bounds memory on one box; this bounds the
 * fleet.
 *
 * IMPORTANT: When the gate is saturated we FAIL FAST (throw) instead of sleeping
 * here for seconds. Sleeping inside the worker callback holds a BullMQ
 * concurrency slot doing nothing — a 3-worker fleet with 30s gate-wait per job
 * effectively drops throughput to zero. Instead we throw and let BullMQ re-queue
 * the job with its exponential job-level backoff, so other jobs in the queue can
 * proceed while this one waits on the scheduler.
 */
const GLOBAL_MAX = parseInt(process.env.ANALYZE_GLOBAL_MAX, 10) || 8;
const GATE_TTL_S = 120;
let gateRedis = null;

function acquireGateRedis() {
  if (!process.env.REDIS_URL || gateRedis) return gateRedis;
  try {
    const { Redis } = require('ioredis');
    gateRedis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      enableOfflineQueue: false,
    });
    gateRedis.on('error', () => { /* gate is best-effort — never crash the worker */ });
  } catch {
    gateRedis = null;
  }
  return gateRedis;
}

class GateSaturatedError extends Error {
  constructor(message) {
    super(message || 'Analysis gate saturated — retrying later.');
    this.name = 'GateSaturatedError';
  }
}

async function withGlobalGate(fn) {
  const redis = acquireGateRedis();
  // Without Redis or with a disabled cap, just run.
  if (!redis || GLOBAL_MAX <= 0) return fn();
  const key = 'ayymus:analyze:active';
  let acquired = false;
  try {
    const tryAcquire = async () => {
      const count = await redis.incr(key);
      redis.expire(key, GATE_TTL_S).catch(() => {});
      if (count <= GLOBAL_MAX) return true;
      await redis.decr(key).catch(() => {});
      return false;
    };
    // Very short in-process retries (total ~2s) then throw back to BullMQ to schedule.
    for (let i = 0; i < 3 && !acquired; i++) {
      acquired = await tryAcquire();
      if (!acquired && i < 2) await sleep(400 * (i + 1));
    }
    if (!acquired) throw new GateSaturatedError(`All ${GLOBAL_MAX} analysis slots are busy — job will retry shortly.`);
    try {
      return await fn();
    } finally {
      if (acquired) await redis.decr(key).catch(() => {});
    }
  } catch (err) {
    if (acquired) await redis.decr(key).catch(() => {});
    if (err instanceof GateSaturatedError) throw err;
    // Redis connectivity issue: best-effort bypass (don't fail analysis entirely).
    return fn();
  }
}

/**
 * Normalize a pasted URL for stable caching. Strips common tracking params and
 * a trailing slash so repeat hits map to the same cache key.
 */
function normalizeUrlForCache(url) {
  try {
    const u = new URL(url);
    const drop = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'spm', 'fbclid', 'gclid'];
    drop.forEach((k) => u.searchParams.delete(k));
    return u.href.replace(/\/$/, '');
  } catch {
    return String(url || '').trim().replace(/\/$/, '');
  }
}

async function readCache(normalizedUrl) {
  try {
    const row = await prisma.analysisCache.findUnique({ where: { normalizedUrl } });
    if (!row) return null;
    if (Date.now() - new Date(row.createdAt).getTime() > CACHE_TTL_MS) return null;
    return row.result;
  } catch {
    return null;
  }
}

/**
 * Non-cacheable results: a Flipkart report whose reviews carry no
 * `flipkart-api` source is a rate-limited snapshot (or blocked run) — caching
 * it would serve stale few-review answers to everyone after us.
 */
function isCacheable(result) {
  if (!result || !result.ok) return false;
  if (result.site && result.site.id === 'flipkart') {
    const hasApi = (result.reviews || []).some((r) => r && r.source === 'flipkart-api');
    if (!hasApi) return false;
  }
  return true;
}

async function writeCache(normalizedUrl, result) {
  try {
    if (!isCacheable(result)) return;
    await prisma.analysisCache.upsert({
      where: { normalizedUrl },
      update: { result, createdAt: new Date() },
      create: { normalizedUrl, result },
    });
  } catch { /* best-effort — a missing/unavailable cache table must never break analysis */ }
}

async function createJob({ url, normalizedUrl, prompt = null }) {
  const job = await queue.add('analyze', { url, normalizedUrl, prompt }, {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: 500,
    removeOnFail: 1000,
  });
  await prisma.analysisJob.create({
    data: { id: String(job.id), url, normalizedUrl, status: 'queued' },
  });
  return String(job.id);
}

function attachWorker(processJob) {
  const worker = new Worker(QUEUE_NAME, async (job) => {
    const id = String(job.id);
    const onProgress = async (steps) => {
      await prisma.analysisJob.update({ where: { id }, data: { progress: steps, status: 'running' } }).catch(() => {});
      job.updateProgress(steps).catch(() => {});
    };
    // Only mark running the first time (or if retried from 'queued'); a
    // GateSaturatedError already wrote retrying so don't clobber that label.
    const prior = await prisma.analysisJob.findUnique({ where: { id } }).catch(() => null);
    if (!prior || prior.status !== 'retrying') {
      await prisma.analysisJob.update({ where: { id }, data: { status: 'running' } }).catch(() => {});
    }
    try {
      const result = await processJob(job.data, onProgress);
      await writeCache(job.data.normalizedUrl, result);
      await prisma.analysisJob.update({ where: { id }, data: { result, status: 'done' } }).catch(() => {});
      return result;
    } catch (err) {
      const isRetriable =
        err && err.name === 'GateSaturatedError' ||
        (job.attemptsMade != null && (job.opts.attempts || 1) > job.attemptsMade + 1);
      if (isRetriable) {
        await prisma.analysisJob.update({
          where: { id },
          data: {
            status: 'retrying',
            error: (err && err.message) || 'Analysis will retry shortly.',
          },
        }).catch(() => {});
      } else {
        await prisma.analysisJob.update({
          where: { id },
          data: {
            status: 'failed',
            error: (err && err.message) || 'Analysis failed',
          },
        }).catch(() => {});
      }
      throw err;
    }
  }, {
    connection,
    concurrency: QUEUE_CONCURRENCY,
    settings: {
      stalledInterval: 30000,
      maxStalledCount: 2,
    },
  });

  worker.on('failed', (job, err) => {
    console.error(`[worker] job ${job && job.id} failed (final):`, err && err.message);
  });

  worker.on('retrying', (job) => {
    console.log(`[worker] job ${job && job.id} retrying (attempt ${(job && job.attemptsMade) || '?'})`);
  });

  return worker;
}

module.exports = { queue, createJob, readCache, writeCache, attachWorker, normalizeUrlForCache, isCacheable, QUEUE_CONCURRENCY, withGlobalGate };
