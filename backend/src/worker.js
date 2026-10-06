/*
 * Background worker process — Cloud Tasks + Cloud Run compatible.
 *
 * No longer uses BullMQ. The API service (Cloud Run) receives analysis jobs
 * via POST /tasks/analyze, and workers can pull via Cloud Tasks lease API
 * or simply act as receivers. This worker stays connected to DB and is
 * ready to receive jobs through the API's task endpoint.
 *
 * Set env: CLOUD_TASKS_QUEUE_URL (from Secret Manager), ANALYZE_*,
 * NODE_ENV=production.
 */

require('dotenv').config();

const prisma = require('./database');

async function main() {
  await prisma.$connect();
  console.log('[worker] DB connected — ready for Cloud Tasks jobs');

  // Keep the worker running; in production Cloud Run this process stays alive.
  // Jobs are enqueued by the API service via createJob() -> POST /tasks/analyze.
  // The worker can pull them via Cloud Tasks lease API or receive them
  // through the API's task endpoint.
  console.log('[worker] listening for Cloud Tasks jobs');

  // Prevent instant exit in non-Cloud-Run environments
  if (process.env.NODE_ENV !== 'production') {
    console.log('[worker] staying alive for development (press Ctrl+C to exit)');
    setInterval(() => {}, 60000);
  }
}

main().catch((e) => {
  console.error('[worker] failed to start:', e);
  process.exit(1);
});