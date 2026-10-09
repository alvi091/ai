/*
 * agentTools — the tools Ayymus's product-chat agent can call.
 *
 * Every tool is a thin, time-boxed wrapper around an existing service:
 *   scrape_product    analysis pipeline (cache -> Cloud Tasks worker -> inline)
 *   research_product  researchService (findings + problems + alternatives)
 *   web_search        researchService.webSearch (Exa -> SERP -> Gemini)
 *   read_url          ayymus-reach /web  (Jina Reader markdown)
 *   youtube_transcript ayymus-reach /youtube (yt-dlp transcript)
 *
 * Responses are compact summaries — the model never sees raw HTML/review dumps.
 */

const prisma = require('../database');
const { analyzeUrl } = require('./analyzeUrlService');
const { createJob, readCache, queueConfigured, normalizeUrlForCache } = require('./jobQueue');
const researchService = require('./researchService');
const reachClient = require('./reachClient');

const TOOL_TIMEOUTS = {
  scrape_product: 75000,
  research_product: 40000,
  web_search: 25000,
  read_url: 18000,
  youtube_transcript: 30000,
};

const TOOL_DEFINITIONS = [
  {
    name: 'scrape_product',
    description:
      'Fetch and analyze a product listing page: current price, rating, review highlights, price fairness and a buy verdict. Use when the user shares a product URL or asks about a specific listing.',
    parameters: {
      type: 'OBJECT',
      properties: {
        url: { type: 'STRING', description: 'Absolute http(s) URL of the product page' },
      },
      required: ['url'],
    },
  },
  {
    name: 'research_product',
    description:
      'Run product research on the web: expert findings, common problems reported by owners, and alternative products. Use before giving a buy/no-buy recommendation.',
    parameters: {
      type: 'OBJECT',
      properties: {
        productName: { type: 'STRING', description: 'Product name, e.g. "Motorola Edge 50 Fusion"' },
        brand: { type: 'STRING' },
        category: { type: 'STRING', description: 'e.g. smartphone, earbuds, laptop' },
        price: { type: 'NUMBER', description: 'Approximate price in INR' },
      },
      required: ['productName'],
    },
  },
  {
    name: 'web_search',
    description:
      'Search the web (semantic search + Google results). Use for recent information, reviews, comparisons and news that are not in the product context.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING' },
        num: { type: 'NUMBER', description: 'Number of results, 1-10 (default 5)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'read_url',
    description:
      'Read any web page (article, review, forum thread) and return its text. Use to verify a claim or pull details out of a search result.',
    parameters: {
      type: 'OBJECT',
      properties: {
        url: { type: 'STRING', description: 'Absolute http(s) URL to read' },
      },
      required: ['url'],
    },
  },
  {
    name: 'youtube_transcript',
    description: 'Get the transcript of a YouTube video. Use for video reviews.',
    parameters: {
      type: 'OBJECT',
      properties: {
        url: { type: 'STRING', description: 'Absolute http(s) YouTube URL' },
      },
      required: ['url'],
    },
  },
];

// --------------------------------------------------------------------------- #
// Helpers
// --------------------------------------------------------------------------- #

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)),
      ms
    );
    if (timer.unref) timer.unref();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requireHttpUrl(url) {
  const raw = String(url || '').trim();
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('invalid URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('only http(s) URLs are supported');
  }
  return raw;
}

function summarizeAnalysis(analysis) {
  if (!analysis || !analysis.ok) {
    return { ok: false, error: (analysis && analysis.error) || 'analysis failed' };
  }
  const p = analysis.product || {};
  const report = analysis.report || {};
  const intel = report.intelligence || {};
  const reviews = intel.reviewAnalysis || {};
  const price = intel.price || {};
  return {
    ok: true,
    url: analysis.resolvedUrl || null,
    site: (analysis.site && analysis.site.label) || null,
    title: p.title || p.name || null,
    brand: p.brand || null,
    price: p.price ?? null,
    originalPrice: p.originalPrice ?? null,
    currency: p.currency || 'INR',
    rating: p.rating ?? null,
    reviewCount: p.ratingCount || p.reviewCount || null,
    verdict: report.verdict || (analysis.analytics && analysis.analytics.decision) || null,
    priceFairness: price.fairnessLabel || null,
    bestTimeToBuy: price.bestTimeToBuy || null,
    praises: (reviews.praises || []).slice(0, 5),
    complaints: (reviews.complaints || []).slice(0, 5),
    recurringIssues: (reviews.recurringIssues || []).slice(0, 5),
    alternatives: (analysis.alternatives || []).slice(0, 4).map((a) => ({
      name: a.name,
      price: a.price,
      rating: a.rating,
    })),
  };
}

async function pollJob(jobId, budgetMs) {
  const deadline = Date.now() + budgetMs;
  while (Date.now() < deadline) {
    const job = await prisma.analysisJob.findUnique({ where: { id: jobId } }).catch(() => null);
    if (job && job.status === 'completed') return summarizeAnalysis(job.result);
    if (job && job.status === 'failed') {
      return { ok: false, error: job.error || 'analysis failed' };
    }
    await sleep(2500);
  }
  return {
    ok: false,
    pending: true,
    jobId,
    error:
      'The analysis was queued and is still running. Tell the user it is in progress and they will get the full report shortly.',
  };
}

// --------------------------------------------------------------------------- #
// Tool implementations
// --------------------------------------------------------------------------- #

async function scrapeProduct({ url }) {
  const target = requireHttpUrl(url);
  const normalized = normalizeUrlForCache(target);

  const cached = await readCache(normalized).catch(() => null);
  if (cached) return { ...summarizeAnalysis(cached), cached: true };

  if (queueConfigured()) {
    const jobId = await createJob({ url: target, normalizedUrl: normalized, prompt: null });
    if (jobId) return pollJob(jobId, 70000);
  }

  const result = await analyzeUrl({ url: target, prompt: null });
  return summarizeAnalysis(result);
}

async function researchProductTool({ productName, brand, category, price }) {
  const name = String(productName || '').trim();
  if (!name) throw new Error('productName is required');

  const [findings, problems, alternatives] = await Promise.allSettled([
    researchService.researchProduct({ productUrl: null, productName: name, brand, category }),
    researchService.findCommonProblems({ productName: name, brand, reviews: [] }),
    researchService.findAlternatives({ productName: name, brand, category, price }),
  ]);

  const trimFinding = (f) => ({
    title: f.sourceTitle,
    domain: f.sourceDomain,
    type: f.sourceType,
    text: String(f.finding || '').slice(0, 300),
    url: f.sourceUrl,
    read: Boolean(f.read),
  });

  return {
    ok: true,
    findings:
      findings.status === 'fulfilled'
        ? findings.value.slice(0, 8).map(trimFinding)
        : [],
    problems: problems.status === 'fulfilled' ? problems.value.slice(0, 5) : [],
    alternatives: alternatives.status === 'fulfilled' ? alternatives.value.slice(0, 5) : [],
    errors: [findings, problems, alternatives]
      .filter((r) => r.status === 'rejected')
      .map((r) => String((r.reason && r.reason.message) || r.reason).slice(0, 150)),
  };
}

async function webSearchTool({ query, num }) {
  const q = String(query || '').trim();
  if (!q) throw new Error('query is required');
  const results = await researchService.webSearch(q, Math.min(Math.max(parseInt(num, 10) || 5, 1), 10));
  return {
    ok: true,
    results: results.slice(0, 10).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: String(r.snippet || '').slice(0, 300),
      domain: r.domain,
    })),
  };
}

async function readUrlTool({ url }) {
  const target = requireHttpUrl(url);
  if (!reachClient.available()) throw new Error('page reading is not configured (REACH_BASE_URL missing)');
  const data = await reachClient.readPage(target, 15000);
  const text = String((data && data.text) || '').slice(0, 6000);
  return { ok: true, url: target, source: data.source, text, truncated: text.length >= 6000 };
}

async function youtubeTool({ url }) {
  const target = requireHttpUrl(url);
  if (!reachClient.available()) throw new Error('transcript reading is not configured (REACH_BASE_URL missing)');
  const data = await reachClient.youtubeTranscript(target, 27000);
  const transcript = String((data && data.transcript) || '').slice(0, 6000);
  return {
    ok: true,
    url: target,
    title: data.title,
    channel: data.channel,
    duration: data.duration,
    transcript,
    note: transcript ? undefined : (data.captionError && `caption unavailable: ${data.captionError}`) || 'no transcript available',
  };
}

const IMPLEMENTATIONS = {
  scrape_product: scrapeProduct,
  research_product: researchProductTool,
  web_search: webSearchTool,
  read_url: readUrlTool,
  youtube_transcript: youtubeTool,
};

async function executeTool(name, args = {}) {
  const impl = IMPLEMENTATIONS[name];
  if (!impl) return { ok: false, error: `unknown tool: ${name}` };
  const budget = TOOL_TIMEOUTS[name] || 20000;
  try {
    return await withTimeout(impl(args || {}), budget, name);
  } catch (err) {
    return { ok: false, error: `${name} failed: ${err.message}` };
  }
}

module.exports = {
  TOOL_DEFINITIONS,
  TOOL_TIMEOUTS,
  executeTool,
  summarizeAnalysis,
};
