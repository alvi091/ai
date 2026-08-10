const fs = require('fs');
const path = require('path');
const css = fs.readFileSync('src/index.css', 'utf8');
const defined = [];
for (const m of css.matchAll(/\.([a-z-]+)\s*[{:]/g)) defined.push(m[1]);
const unique = [...new Set(defined)];
const used = new Set();
function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.(jsx|js)$/.test(f)) {
      const c = fs.readFileSync(p, 'utf8');
      for (const m of c.matchAll(/className=["`][^"`]*["`]/g)) {
        const cls = m[0].slice(11, -1);
        for (const tok of cls.split(/\s+/)) {
          const clean = tok.replace(/[:[\]\/!]/g, '').replace(/^-/, '').split(/[\[:]/)[0];
          if (/^[a-z][a-z-]*$/.test(clean)) used.add(clean);
        }
      }
    }
  }
}
walk('src');
const custom = [
  'tile', 'pill', 'chip', 'card', 'card-hover', 'card-soft', 'card-pad', 'card-elevated',
  'eyebrow', 'eyebrow-subtle', 'display', 'tnum', 'shell', 'shell-sm', 'app-container',
  'badge', 'badge-teal', 'badge-success', 'badge-warning', 'badge-danger', 'badge-neutral',
  'field', 'field-lg', 'input', 'select', 'label', 'hairline', 'glow-teal', 'glow-ai',
  'grid-noise', 'dot-grid', 'shimmer', 'skeleton', 'link-teal', 'text-teal-gradient',
  'btn', 'btn-lg', 'btn-md', 'btn-sm', 'btn-primary', 'btn-secondary', 'btn-ghost',
  'btn-danger', 'btn-icon', 'btn-pill', 'focus-ring', 'scrollbar-none', 'font-display',
  'panel', 'insight', 'reasoning', 'intelligence',
];
for (const c of custom) {
  const inCss = unique.includes(c);
  const inJsx = used.has(c);
  if (inJsx && !inCss) console.log('USED BUT NOT DEFINED:', c);
}
