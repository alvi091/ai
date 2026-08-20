const {
  fetchAjioReviews,
  extractAjioProductCode,
  reviewsFromState,
  reviewsFromDom,
} = require('../src/extractors/ajioReviews');
const fs = require('fs');

console.log('extractAjioProductCode:', extractAjioProductCode('https://www.ajio.com/avaasa-mix-n-match-women-floral-print-v-neck-straight-kurta/p/443118706_yellow'));

const html = fs.existsSync('C:/Users/Abc/AppData/Local/Temp/opencode/ajio-ok.html')
  ? fs.readFileSync('C:/Users/Abc/AppData/Local/Temp/opencode/ajio-ok.html', 'utf8')
  : '';
if (html) {
  const state = reviewsFromState(html);
  console.log('state reviews:', state.length);
  if (state.length) console.log('first:', JSON.stringify(state[0]).slice(0, 220));
  try { console.log('dom reviews:', reviewsFromDom(html).length); } catch (e) { console.log('dom parse failed:', e.message); }
} else {
  console.log('no saved ajio html — run a probe/render to capture it first');
}

(async () => {
  const t = Date.now();
  const r = await fetchAjioReviews({ productCode: '443118706_yellow', html, max: 0 });
  console.log('\nfetch result:', r ? r.length : 'null', 'ms', Date.now() - t);
  if (r && r.length) console.log('first:', JSON.stringify(r[0]).slice(0, 220));
  process.exit(0);
})();