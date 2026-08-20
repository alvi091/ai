const {
  fetchMeeshoReviews,
  extractMeeshoProductId,
  reviewsFromState,
  reviewsFromDom,
} = require('../src/extractors/meeshoReviews');
const fs = require('fs');

console.log('extractMeeshoProductId:', extractMeeshoProductId('https://www.meesho.com/churidar/p/5k4wqk'));

const html = fs.existsSync('C:/Users/Abc/AppData/Local/Temp/opencode/meesho.html')
  ? fs.readFileSync('C:/Users/Abc/AppData/Local/Temp/opencode/meesho.html', 'utf8')
  : '';
if (html) {
  console.log('state reviews:', reviewsFromState(html).length);
  try { console.log('dom reviews:', reviewsFromDom(html).length); } catch (e) { console.log('dom parse failed:', e.message); }
} else {
  console.log('no saved meesho html (previously 403)');
}

(async () => {
  const t = Date.now();
  const r = await fetchMeeshoReviews({ productId: '5k4wqk', max: 0 });
  console.log('\nfetch result:', r ? r.length : 'null', 'ms', Date.now() - t);
  if (r && r.length) console.log('first:', JSON.stringify(r[0]).slice(0, 200));
  process.exit(0);
})();