const { fetchMyntraReviews, extractMyntraStyleId, myxState, reviewsFromState } = require('../src/extractors/myntraReviews');

(async () => {
  const url = 'https://www.myntra.com/shirts/strong+and+brave/strong-and-brave-women-odour-free-formal-shirt/20226154/buy';
  const styleId = extractMyntraStyleId(url);
  console.log('styleId:', styleId);

  const fs = require('fs');
  const html = fs.readFileSync('C:/Users/Abc/AppData/Local/Temp/opencode/shirt-myntra.html', 'utf8');
  const state = myxState(html);
  const embedded = reviewsFromState(state);
  console.log('embedded reviews:', embedded.length);
  for (const r of embedded.slice(0, 2)) console.log('  -', r.author, r.rating, '|', r.text.slice(0, 50));

  const msgs = [];
  const fetched = await fetchMyntraReviews({ styleId, html, max: 0, onSpacing: (m) => msgs.push(m) });
  console.log('API fetched:', fetched ? fetched.length : 'null');
  if (fetched && fetched.length) {
    console.log('first:', JSON.stringify(fetched[0]));
    const srcs = {};
    for (const r of fetched) srcs[r.source] = (srcs[r.source] || 0) + 1;
    console.log('sources:', JSON.stringify(srcs));
  }
  console.log('progress:', msgs.slice(0, 5));
  process.exit(0);
})();