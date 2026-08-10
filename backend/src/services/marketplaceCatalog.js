const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

const MARKETPLACE_FILES = [
  'amazon_products.json',
  'flipkart_products.json',
  'meesho_products.json',
  'myntra_products.json',
  'nykaa_products.json',
];

let cache = null;

function loadAll() {
  if (cache) return cache;

  const all = [];
  const byName = new Map();
  const byKey = new Map();

  for (const file of MARKETPLACE_FILES) {
    try {
      const raw = fs.readFileSync(path.join(DATA_DIR, file), 'utf8');
      const json = JSON.parse(raw);
      const products = json.products || [];
      for (const p of products) {
        if (!p || !p.sku) continue;
        const marketplace = String(p.marketplace || file.replace('_products.json', '')).toLowerCase();
        const key = `${marketplace}:${p.sku}`;
        const enriched = { ...p, _key: key, _marketplace: marketplace };
        all.push(enriched);
        byKey.set(key, enriched);
        const name = String(p.name || '').toLowerCase();
        if (!byName.has(name)) byName.set(name, []);
        byName.get(name).push(enriched);
      }
    } catch {
      /* skip unreadable file */
    }
  }

  cache = { all, byKey, byName };
  return cache;
}

function getAll() {
  return loadAll().all;
}

function getByKey(key) {
  return loadAll().byKey.get(key);
}

function findByName(name, marketplace) {
  const list = loadAll().byName.get(String(name || '').toLowerCase()) || [];
  if (!list.length) return null;
  if (marketplace) {
    const m = list.find((p) => String(p._marketplace).toLowerCase() === String(marketplace).toLowerCase());
    if (m) return m;
  }
  return list[0];
}

function searchByCategory(category, limit = 20) {
  const cat = String(category || '').toLowerCase();
  if (!cat) return [];
  const out = [];
  for (const p of loadAll().all) {
    if (String(p.category || '').toLowerCase() === cat) out.push(p);
    if (out.length >= limit) break;
  }
  return out;
}

function categories() {
  const counts = {};
  for (const p of loadAll().all) {
    const c = p.category || 'General';
    counts[c] = (counts[c] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
}

module.exports = { getAll, getByKey, findByName, searchByCategory, categories, MARKETPLACE_FILES };
