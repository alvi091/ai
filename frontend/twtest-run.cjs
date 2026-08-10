const fs = require('fs');
const postcss = require('postcss');
const setupTrackingContext = require('tailwindcss/lib/lib/setupTrackingContext.js');
const processTailwindFeatures = require('tailwindcss/lib/processTailwindFeatures.js');
const resolveConfig = require('tailwindcss/resolveConfig.js').default || require('tailwindcss/resolveConfig.js');

const dir = process.argv[2];
const rawConfig = JSON.parse(fs.readFileSync(dir + '/config.json', 'utf8'));
const config = resolveConfig(rawConfig);
const ctx = setupTrackingContext(config);
const css = fs.readFileSync(dir + '/t.css', 'utf8');
postcss([processTailwindFeatures(ctx)])
  .process(css, { from: undefined })
  .then((r) => {
    console.log('OK');
    console.log(r.css.slice(0, 500));
  })
  .catch((e) => console.log('FAIL:', e.message));
