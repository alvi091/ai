const { syncCatalog } = require('../src/services/amazonService');

async function main() {
  const queries = process.argv.slice(2).filter((q) => !q.startsWith('--'));
  console.log('Syncing Amazon catalog...');
  const report = await syncCatalog(queries);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error('Sync failed:', e.message);
  process.exit(1);
});
