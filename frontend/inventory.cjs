const fs = require('fs');
const path = require('path');
const root = 'src';
const oldTokens = [
  'bg-canvas', 'bg-elevated', 'bg-line', 'border-line',
  'text-ink', 'text-body', 'text-mute', 'text-ink-muted',
  'bg-accent', 'text-accent', 'border-accent',
  'bg-primary-light', 'text-primary-light', 'border-primary-light',
  'bg-green', 'text-green', 'bg-red-', 'text-red-', 'bg-yellow', 'text-yellow',
  'tracking-wide2', 'scrollbar-none', 'animate-breathe', 'animate-scan',
];
function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.(jsx|js)$/.test(f)) {
      const c = fs.readFileSync(p, 'utf8');
      const hits = oldTokens.filter((t) => c.includes(t));
      if (hits.length) console.log(p + '\n  -> ' + hits.join(', '));
    }
  }
}
walk(root);
