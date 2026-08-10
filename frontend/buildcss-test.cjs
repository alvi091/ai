const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const tailwind = require('tailwindcss');
const root = 'C:/Users/Abc/Desktop/projects/ai-shopping/frontend';
process.chdir(root);

const css = fs.readFileSync(root + '/t_min.css', 'utf8');
postcss([tailwind(), require('autoprefixer')])
  .process(css, { from: root + '/t_min.css' })
  .then((r) => {
    const hit = r.css.split('\n').filter((l) => l.includes('239 68 68')).slice(0, 4);
    console.log('SCAN result:', hit.length ? 'FOUND' : 'NONE');
    console.log(hit.join('\n'));
  })
  .catch((e) => {
    console.log('FAIL:', e.message);
  });
