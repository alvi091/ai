require('dotenv').config();
const { extractProductFromUrl } = require('../src/extractors');

(async () => {
  const url = process.argv[2] || 'https://www.flipkart.com/apple-iphone-15-black-128-gb/p/itm6ac6485515ae4';
  const t0 = Date.now();
  const res = await extractProductFromUrl(url, (m) => console.log('  step:', m));
  console.log(`\n[${Date.now() - t0}ms]`);
  console.log('ok:', res.ok);
  if (!res.ok) {
    console.log('kind:', res.kind);
    console.log('error:', res.error);
    console.log('status:', res.status);
  } else {
    const p = res.product;
    console.log('title:', p.title);
    console.log('price:', p.price, p.currency);
    console.log('rating:', p.rating, 'reviews_count:', p.reviews_count, 'ratingCount:', p.ratingCount);
    console.log('reviews extracted:', res.reviews.length);
    const bySrc = {};
    for (const r of res.reviews) bySrc[r.source] = (bySrc[r.source] || 0) + 1;
    console.log('review sources:', JSON.stringify(bySrc));
    console.log('first 3 reviews:', res.reviews.slice(0, 3).map((r) => `${r.author}=${r.rating}:${String(r.text||'').slice(0,30)}`));
    console.log('extraction:', JSON.stringify(res.extraction, null, 2));
  }
  process.exit(0);
})();