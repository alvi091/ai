const { extractProductFromUrl } = require('../src/extractors');
const u = 'https://www.amazon.in/Apple-iPhone-15-128GB-Blue/dp/B0CHX1W1XY';
extractProductFromUrl(u, (m) => console.log('STEP', m)).then((r) => {
  console.log('ok', r.ok, 'reviews', r.reviews.length);
  const srcs = {};
  for (const x of r.reviews) { const s = x.source; srcs[s] = (srcs[s] || 0) + 1; }
  console.log('sources', JSON.stringify(srcs));
  console.log('first review', JSON.stringify(r.reviews[0], null, 1).slice(0, 600));
}).catch((e) => console.error(e));