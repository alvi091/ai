/*
 * Analysis job queue — Cloud Tasks + Cloud Run compatible.
 *
 * Replaces BullMQ + Redis with Google Cloud Tasks for job dispatching,
 * and uses in-process concurrency gating instead of a distributed Redis gate.
 *
 * Dispatch modes (both push the same payload to the worker's /tasks/analyze):
 *   • CLOUD_TASKS_QUEUE set        — enqueue through the Cloud Tasks API
 *     (retries + backoff; requires CLOUD_TASKS_WORKER_URL as the HTTP target
 *     and CLOUD_TASKS_OIDC_SA for a private worker).
 *   • only CLOUD_TASKS_WORKER_URL  — POST straight to the worker service.
 *   • neither                      — queue disabled; caller falls back to 429.
 *
 * Secrets: CLOUD_TASKS_QUEUE / CLOUD_TASKS_WORKER_URL / CLOUD_TASKS_OIDC_SA
 * via Secret Manager.
 */

require('dotenv').config();

const prisma = require('../database');

// --- Config --------------------------------------------------------------

const CLOUD_TASKS_QUEUE = process.env.CLOUD_TASKS_QUEUE || '';
const CLOUD_TASKS_WORKER_URL = process.env.CLOUD_TASKS_WORKER_URL
  || process.env.CLOUD_TASKS_QUEUE_URL
  || '';
const CLOUD_TASKS_OIDC_SA = process.env.CLOUD_TASKS_OIDC_SA || '';
const CONCURRENCY = parseInt(process.env.ANALYZE_WORKER_CONCURRENCY, 10) || 3;
const GLOBAL_MAX_ANALYSES = parseInt(process.env.ANALYZE_GLOBAL_MAX, 10) || 8;
const JOB_TIMEOUT_MS = parseInt(process.env.ANALYZE_JOB_TIMEOUT_MS, 10) || 180000;
const CACHE_TTL_MS = parseInt(process.env.ANALYSIS_CACHE_TTL_MS, 10) || 12 * 60 * 60 * 1000;

const queueConfigured = Boolean(CLOUD_TASKS_QUEUE || CLOUD_TASKS_WORKER_URL);

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
 * Enqueue an analysis job for the worker.
 * The worker service exposes POST /tasks/analyze with this payload shape and
 * runs analyzeUrl + writeCache, updating the AnalysisJob row by jobId.
 * Returns the AnalysisJob id (pollable via GET /api/analyze/:jobId).
 */
async function createJob({ url, normalizedUrl, prompt = null }) {
  if (!queueConfigured) {
    console.warn('[jobQueue] Cloud Tasks not configured (CLOUD_TASKS_QUEUE / CLOUD_TASKS_WORKER_URL) — job not enqueued');
    return null;
  }

  const job = await prisma.analysisJob.create({
    data: { url, normalizedUrl, status: 'queued' },
  });

  const payload = { jobId: job.id, url, normalizedUrl, prompt };

  try {
    if (CLOUD_TASKS_QUEUE) {
      await enqueueCloudTask(payload);
    } else {
      await postDirect(payload);
    }
  } catch (err) {
    await prisma.analysisJob.update({
      where: { id: job.id },
      data: { status: 'failed', error: `enqueue failed: ${err.message}` },
    });
    throw err;
  }

  return job.id;
}

// Cloud Tasks API — retries/backoff handled by the queue.
async function enqueueCloudTask(payload) {
  const { CloudTasksClient } = require('@google-cloud/tasks');
  const client = new CloudTasksClient();

  const task = {
    httpRequest: {
      httpMethod: 'POST',
      url: `${CLOUD_TASKS_WORKER_URL.replace(/\/+$/, '')}/tasks/analyze`,
      headers: { 'Content-Type': 'application/json' },
      body: Buffer.from(JSON.stringify(payload)),
      ...(CLOUD_TASKS_OIDC_SA
        ? { oidcToken: { serviceAccountEmail: CLOUD_TASKS_OIDC_SA, audience: CLOUD_TASKS_WORKER_URL } }
        : {}),
    },
  };

  await client.createTask({ parent: CLOUD_TASKS_QUEUE, task });
}

// Fallback: direct POST to the worker service (no retries).
async function postDirect(payload) {
  const res = await fetch(`${CLOUD_TASKS_WORKER_URL.replace(/\/+$/, '')}/tasks/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`worker responded ${res.status}`);
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
  queueConfigured,
  CONCURRENCY,
  JOB_TIMEOUT_MS,
  CACHE_TTL_MS,
};