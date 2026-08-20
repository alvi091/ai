const { reviewsFromAmazonHtml, extractAsin, fetchAmazonReviews } = require('../src/extractors/amazonReviews');
const fs = require('fs');

const html = fs.readFileSync('C:/Users/Abc/AppData/Local/Temp/opencode/amazon-prod-desktop.html', 'utf8');
const cards = reviewsFromAmazonHtml(html, 'amazon-page');
console.log('extractAsin from url:', extractAsin('https://www.amazon.in/Apple-iPhone-15-128GB-Blue/dp/B0CHX1W1XY'));
console.log('parsed cards from saved html:', cards.length);
console.log('first:', JSON.stringify(cards[0], null, 1));
console.log('sources:', JSON.stringify([...new Set(cards.map((c) => c.source))]));

(async () => {
  const t = Date.now();
  const r = await fetchAmazonReviews({ asin: 'B0CHX2WQLX', max: 0 });
  console.log('\nlive fetch reviews:', r ? r.length : 'null', 'ms', Date.now() - t);
  if (r && r.length) console.log('first live:', JSON.stringify(r[0]));
  process.exit(0);
})();