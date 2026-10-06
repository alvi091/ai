/*
 * Analysis job queue — Cloud Tasks + Cloud Run compatible.
 *
 * Replaces BullMQ + Redis with Google Cloud Tasks for job dispatching,
 * and uses in-process concurrency gating instead of a distributed Redis gate.
 *
 * Deployment:
 *   • API service (Cloud Run)   — exposes /tasks/endpoint to receive jobs
 *   • Worker (Cloud Run)        — pulls jobs via Cloud Tasks lease API
 *   • No Redis required; concurrency capped by Cloud Run instance count
 *   • Secrets: CLOUD_TASKS_QUEUE_URL set via Secret Manager
 */

require('dotenv').config();

const prisma = require('../database');

// --- Config --------------------------------------------------------------

const CLOUD_TASKS_QUEUE_URL = process.env.CLOUD_TASKS_QUEUE_URL || '';
const CONCURRENCY = parseInt(process.env.ANALYZE_WORKER_CONCURRENCY, 10) || 3;
const GLOBAL_MAX_ANALYSES = parseInt(process.env.ANALYZE_GLOBAL_MAX, 10) || 8;
const JOB_TIMEOUT_MS = parseInt(process.env.ANALYZE_JOB_TIMEOUT_MS, 10) || 180000;
const CACHE_TTL_MS = parseInt(process.env.ANALYSIS_CACHE_TTL_MS, 10) || 12 * 60 * 60 * 1000;

// Lightweight in-process semaphore to cap concurrent analyses per worker instance
let activeCount = 0;
const semaphore = {
  async acquire() {
    if (activeCount < GLOBAL_MAX_ANALYSES) {
      activeCount++;
      return true;
    }
    return false;
  },
  release() {
    activeCount = Math.max(0, activeCount - 1);
  },
};

/**
 * Enqueue an analysis job into Cloud Tasks.
 * The Cloud Run API service must expose a /tasks/analyze endpoint that
 * receives the same payload shape and calls analyzeUrlService + writeCache.
 */
async function createJob({ url, normalizedUrl, prompt = null }) {
  if (!CLOUD_TASKS_QUEUE_URL) {
    console.warn('[jobQueue] CLOUD_TASKS_QUEUE_URL not set — job not enqueued');
    return null;
  }

  const taskUrl = new URL(CLOUD_TASKS_QUEUE_URL);
  taskUrl.pathname = '/tasks/analyze';

  const fetch = require('node-fetch').fetch || require('node-fetch')({});
  await fetch(taskUrl.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, normalizedUrl, prompt }),
  });

  // Also persist a lightweight job record for status tracking
  try {
    await prisma.analysisJob.create({
      data: { id: `cloudtask-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, url, normalizedUrl, status: 'queued' },
    });
  } catch {}

  return { id: `ct-${Date.now()}`, queuedAt: new Date() };
}

/**
 * Read cached result from DB (same as BullMQ version).
 */
async function readCache(normalizedUrl) {
  try {
    const row = await prisma.analysisCache.findUnique({ where: { normalizedUrl } });
    if (!row) return null;
    if (Date.now() - new Date(row.createdAt).getTime() > CACHE_TTL_MS) return null;
    return row.result;
  } catch { return null; }
}

/**
 * Write cached result to DB (same as BullMQ version).
 */
async function writeCache(normalizedUrl, result) {
  try {
    if (!isCacheable(result)) return;
    await prisma.analysisCache.upsert({
      where: { normalizedUrl },
      update: { result, createdAt: new Date() },
      create: { normalizedUrl, result },
    });
  } catch { /* best-effort */ }
}

/**
 * In-process concurrency gate — replaces the Redis-based global gate.
 * Each Cloud Run worker instance has its own semaphore; total fleet concurrency
 * is approximately instanceCount × GLOBAL_MAX_ANALYSES.
 */
async function withGlobalGate(fn) {
  if (await semaphore.acquire()) {
    try {
      return await fn();
    } finally {
      semaphore.release();
    }
  } else {
    throw new Error(`Analysis gate saturated — ${GLOBAL_MAX_ANALYSES} max concurrent analyses per worker instance`);
  }
}

/**
 * Normalize a pasted URL for stable caching.
 */
function normalizeUrlForCache(url) {
  try {
    const u = new URL(url);
    const drop = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'spm', 'fbclid', 'gclid'];
    drop.forEach((k) => u.searchParams.delete(k));
    return u.href.replace(/\/$/, '');
  } catch { return String(url || '').trim().replace(/\/$/, ''); }
}

/**
 * Is the result cacheable? (same logic as BullMQ version)
 */
function isCacheable(result) {
  if (!result || !result.ok) return false;
  if (result.site && result.site.id === 'flipkart') {
    const hasApi = (result.reviews || []).some((r) => r && r.source === 'flipkart-api');
    if (!hasApi) return false;
  }
  return true;
}

// --- Exports ------------------------------------------------------------

module.exports = {
  createJob,
  readCache,
  writeCache,
  withGlobalGate,
  normalizeUrlForCache,
  isCacheable,
  CONCURRENCY,
  JOB_TIMEOUT_MS,
  CACHE_TTL_MS,
};