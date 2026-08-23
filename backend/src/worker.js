/*
 * Background worker process — drains the URL-analysis queue.
 *
 * Run separately from the API (e.g. `npm run start:worker` on its own Render
 * service). The heavy crawl + render + LLM work happens here, capped by BullMQ
 * concurrency so the API stays fast and memory-safe.
 */

require('dotenv').config();

const { attachWorker, withGlobalGate } = require('./services/jobQueue');
const { analyzeUrl } = require('./services/analyzeUrlService');
const prisma = require('./database');

const JOB_TIMEOUT_MS = parseInt(process.env.ANALYZE_JOB_TIMEOUT_MS, 10) || 180000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Analysis timed out after ${Math.round(ms / 1000)}s`)), ms)),
  ]);
}

async function main() {
  await prisma.$connect();
  console.log('[worker] DB connected');

  const processJob = async (data) => {
    return withGlobalGate(() =>
      withTimeout(
        analyzeUrl({
          url: data.url,
          prompt: data.prompt || null,
          user: null,
          intent: data.intent || {},
        }),
        JOB_TIMEOUT_MS,
      )
    );
  };

  const worker = attachWorker(processJob);
  console.log('[worker] listening on queue');
}

main().catch((e) => {
  console.error('[worker] failed to start:', e);
  process.exit(1);
});
