const fs = require('fs');
const path = require('path');

// Build exact-name map of all files in src, keyed by full lowercase relative path
const exactPaths = new Map();
function walk(d, rel) {
  for (const f of fs.readdirSync(d)) {
    const full = path.join(d, f);
    const relPath = rel ? rel + '/' + f : f;
    const s = fs.statSync(full);
    if (s.isDirectory()) walk(full, relPath);
    else exactPaths.set(relPath.toLowerCase(), relPath);
  }
}
walk('src', '');

const issues = [];
function walk2(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const s = fs.statSync(p);
    if (s.isDirectory()) walk2(p);
    else if (/\.(jsx|js)$/.test(f)) {
      const c = fs.readFileSync(p, 'utf8');
      for (const m of c.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
        const mod = m[1];
        if (!mod.startsWith('.')) continue;
        const base = path.dirname(p);
        const resolved = path.resolve(base, mod);
        const relFromSrc = path.relative('src', resolved).replace(/\\/g, '/');
        let target = relFromSrc;
        if (!/\.(jsx|js)$/.test(target)) {
          // try with extensions
          if (exactPaths.has((target + '.jsx').toLowerCase())) target = target + '.jsx';
          else if (exactPaths.has((target + '.js').toLowerCase())) target = target + '.js';
          else {
            issues.push(`${p.replace(/\\/g, '/')} -> cannot resolve "${mod}"`);
            continue;
          }
        }
        const exact = exactPaths.get(target.toLowerCase());
        if (exact !== target) {
          issues.push(`${p.replace(/\\/g, '/')} imports "${mod}" but actual path is "src/${exact}"`);
        }
      }
    }
  }
}
walk2('src');
console.log(issues.length ? issues.join('\n') : 'All relative imports match exact file case');
