/*
 * reachClient — HTTP client for the private `ayymus-reach` Cloud Run service,
 * which wraps the Agent Reach capability channels:
 *   POST /web     Jina Reader -> clean markdown for any page (scraping)
 *   POST /search  Exa semantic web search (zero-config, no API key)
 *   POST /youtube yt-dlp -> video metadata + transcript
 *   POST /rss     feedparser -> feed entries
 *
 * REACH_BASE_URL is injected by the deploy pipeline; when it is empty every
 * helper returns null / throws so callers can fall back to the pre-existing
 * Bright Data SERP and Gemini paths.
 *
 * Successful responses are cached in Redis for 12h (best-effort — a Redis
 * outage must never break a request) to stay inside free-tier quotas.
 */

const crypto = require('crypto');
const config = require('../config');

const DEFAULT_CACHE_TTL_SEC = 12 * 60 * 60;

let redis = null;
let redisTried = false;

function cacheRedis() {
  if (redisTried) return redis;
  redisTried = true;
  if (!config.redis.url) return null;
  try {
    const { Redis } = require('ioredis');
    redis = new Redis(config.redis.url, { maxRetriesPerRequest: 1 });
    redis.on('error', () => { /* cache is best-effort */ });
  } catch {
    redis = null;
  }
  return redis;
}

function available() {
  return Boolean(config.reach.baseUrl);
}

async function reachPost(path, body, { timeoutMs = 30000, cacheTtlSec = DEFAULT_CACHE_TTL_SEC } = {}) {
  const base = config.reach.baseUrl;
  if (!base) throw new Error('REACH_BASE_URL not configured');

  const cacheKey = `reach:${crypto
    .createHash('sha1')
    .update(`${path}:${JSON.stringify(body)}`)
    .digest('hex')}`;
  const client = cacheRedis();
  if (client && cacheTtlSec > 0) {
    try {
      const hit = await client.get(cacheKey);
      if (hit) return JSON.parse(hit);
    } catch { /* ignore */ }
  }

  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`reach ${path} -> ${res.status}: ${text.slice(0, 200)}`);
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`reach ${path} returned non-JSON output`);
  }

  if (client && cacheTtlSec > 0) {
    try {
      await client.set(cacheKey, text, 'EX', cacheTtlSec);
    } catch { /* ignore */ }
  }
  return json;
}

const readPage = (url, timeoutMs = 30000) =>
  reachPost('/web', { url }, { timeoutMs });
const webSearch = (query, num = 6, timeoutMs = 20000) =>
  reachPost('/search', { query, num }, { timeoutMs });
const youtubeTranscript = (url, timeoutMs = 45000) =>
  reachPost('/youtube', { url }, { timeoutMs });
const readRss = (url, limit = 10, timeoutMs = 30000) =>
  reachPost('/rss', { url, limit }, { timeoutMs });

module.exports = {
  available,
  reachPost,
  readPage,
  webSearch,
  youtubeTranscript,
  readRss,
};
