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
 * fleet. The counter is best-effort (a crashed process skips one DECR, which a
 * 2-min TTL heals), and a saturated gate backs off briefly rather than failing.
 */
const GLOBAL_MAX = parseInt(process.env.ANALYZE_GLOBAL_MAX, 10) || 16;
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

async function withGlobalGate(fn) {
  const redis = acquireGateRedis();
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
    acquired = await tryAcquire();
    if (!acquired) {
      // Saturated — wait a bit and retry a few times (backpressure).
      for (let i = 0; i < 5 && !acquired; i++) {
        await sleep(2000 * (i + 1));
        acquired = await tryAcquire();
      }
    }
    try {
      return await fn();
    } finally {
      if (acquired) await redis.decr(key).catch(() => {});
    }
  } catch {
    if (acquired) await redis.decr(key).catch(() => {});
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
  const job = await queue.add('analyze', { url, normalizedUrl, prompt });
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
    await prisma.analysisJob.update({ where: { id }, data: { status: 'running' } }).catch(() => {});
    try {
      const result = await processJob(job.data, onProgress);
      await writeCache(job.data.normalizedUrl, result);
      await prisma.analysisJob.update({ where: { id }, data: { result, status: 'done' } }).catch(() => {});
      return result;
    } catch (err) {
      await prisma.analysisJob.update({ where: { id }, data: { status: 'failed', error: (err && err.message) || 'Analysis failed' } }).catch(() => {});
      throw err;
    }
  }, { connection, concurrency: QUEUE_CONCURRENCY });

  worker.on('failed', (job, err) => {
    console.error(`[worker] job ${job && job.id} failed:`, err && err.message);
  });

  return worker;
}

module.exports = { queue, createJob, readCache, writeCache, attachWorker, normalizeUrlForCache, isCacheable, QUEUE_CONCURRENCY, withGlobalGate };
