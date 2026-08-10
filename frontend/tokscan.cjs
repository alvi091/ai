const fs = require('fs');
const path = require('path');
const root = 'src';
const known = [
  'primary', 'accent', 'surface', 'success', 'warning', 'danger',
  'canvas', 'elevated', 'line', 'body', 'mute', 'heading', 'soft', 'ink',
  'primary-light', 'primary-dark',
  'white', 'black', 'transparent', 'current', 'inherit',
  'gray', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald',
  'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia',
  'pink', 'rose', 'slate', 'zinc', 'stone', 'neutral',
];
const prefixes = ['bg', 'text', 'border', 'divide', 'ring', 'fill', 'stroke', 'from', 'via', 'to', 'decoration', 'shadow', 'outline', 'caret', 'accent', 'placeholder'];
const re = new RegExp('\\b(' + prefixes.join('|') + ')-([a-z][a-z0-9-]*)', 'g');
const hits = new Map();
function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.(jsx|js)$/.test(f)) {
      const c = fs.readFileSync(p, 'utf8');
      for (const m of c.matchAll(re)) {
        const name = m[2].split('/')[0].split('[')[0];
        if (name === 'white' || name === 'black') continue;
        const base = name.replace(/-\d+$/, '');
        const base2 = name.replace(/-(\d+)$/, '');
        const isKnown = known.includes(name) || known.includes(base) || known.includes(base2) || /^[a-z]+-\d+$/.test(name) || /^[a-z]+-\d+-\d+$/.test(name);
        if (!isKnown && name.length > 1) {
          if (!hits.has(name)) hits.set(name, []);
          hits.get(name).push(p.replace(/\\/g, '/'));
        }
      }
    }
  }
}
walk(root);
for (const [k, v] of [...hits.entries()].sort()) {
  console.log(k, '->', [...new Set(v)].join(', '));
}
