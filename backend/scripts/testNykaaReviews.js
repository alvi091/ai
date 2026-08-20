const {
  fetchNykaaReviews,
  extractNykaaProductId,
  reviewsFromJsonLd,
} = require('../src/extractors/nykaaReviews');
const fs = require('fs');

console.log('extractNykaaProductId:', extractNykaaProductId('https://www.nykaa.com/maybelline-fit-me/p/1044693'));

const html = fs.existsSync('C:/Users/Abc/AppData/Local/Temp/opencode/nykaa.html')
  ? fs.readFileSync('C:/Users/Abc/AppData/Local/Temp/opencode/nykaa.html', 'utf8')
  : '';
if (html) console.log('jsonld reviews:', reviewsFromJsonLd(html).length);

(async () => {
  const t = Date.now();
  const r = await fetchNykaaReviews({ productId: '1044693', max: 0 });
  console.log('\nfetch result:', r ? r.length : 'null', 'ms', Date.now() - t);
  if (r && r.length) console.log('first:', JSON.stringify(r[0]).slice(0, 200));
  process.exit(0);
})();