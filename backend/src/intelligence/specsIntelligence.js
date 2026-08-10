/*
 * Specification intelligence — explains specs instead of merely listing them.
 *
 * A knowledge base converts raw spec rows into plain-language meaning plus
 * persona fit ("16GB RAM → excellent for programming, overkill for light browsing").
 * Out-of-KB specs pass through with a generic framing. Optional LLM refinement
 * happens upstream in the assembler; this is the deterministic core.
 */

const SPEC_KNOWLEDGE = [
  {
    keys: ['ram', 'memory', 'system memory'],
    label: 'RAM',
    explanation: (v) => {
      const gb = parseGb(v);
      if (gb == null) return null;
      if (gb >= 32) return `${v} RAM is serious horsepower — comfortable for heavy development, video editing, virtual machines, and 3D work. Overkill for everyday web + office use.`;
      if (gb >= 16) return `${v} RAM is excellent for programming, heavy multitasking and modern games. Casuals need less — this is headroom, not a must.`;
      if (gb >= 8) return `${v} RAM is the solid middle ground: smooth web, office, light creative work. Games and heavy workloads will feel the ceiling.`;
      return `${v} RAM is entry-level — fine for light browsing and docs; you will hit limits with multitasking or modern apps.`;
    },
    fit: (v) => {
      const n = parseGb(v);
      if (n == null) return [];
      const list = [];
      if (n >= 16) list.push({ group: 'Developers & heavy multitaskers', fit: 'high', why: `${n} GB handles multiple browser profiles, IDEs and containers together.` });
      if (n >= 8) list.push({ group: 'Students & office users', fit: n >= 16 ? 'good' : 'high', why: n >= 16 ? 'Plenty for documents, browsers and streaming.' : `${n} GB covers daily work without fuss.` });
      if (n >= 8) list.push({ group: 'Gamers', fit: n >= 16 ? 'good' : 'ok', why: n >= 16 ? 'Meets modern title requirements comfortably.' : 'Playable, but keep only the game open.' });
      if (n <= 8) list.push({ group: 'Casual / budget buyers', fit: n >= 4 ? 'good' : 'ok', why: 'Light tasks only — close apps to stay fluid.' });
      return list;
    },
  },
  {
    keys: ['storage', 'ssd', 'hard drive', 'hdd', 'memory capacity'],
    label: 'Storage',
    explanation: (v) => `Around ${clean(v)} of storage — ${isSsd(v) ? 'SSD-class' : 'capacity-dense'} storage. ${isSsd(v) ? 'Boots and loads fast, which matters more in daily feel than raw size.' : 'Large but slow; expect slower boots and app opens.'}`,
    fit: (v) => [],
  },
  {
    keys: ['processor', 'cpu', 'chipset', 'chip'],
    label: 'Processor',
    explanation: (v) => `The ${clean(v)} chip drives everyday responsiveness. ${/\b(ultra|i7|i9|ryzen 7|ryzen 9|m3|m4|snapdragon 8)\b/i.test(v) ? 'This is a strong, modern-class processor — sustained heavy workloads and creative tools will run well.' : /\b(i3|ryzen 3|celeron|pentium|a13|snapdragon 6|dimensity 6100)\b/i.test(v) ? 'This is an entry-to-mid processor — fine for everyday apps, stretchy for heavy tasks.' : 'Mid-class — a balanced everyday experience, with limits under sustained heavy load.'}`,
    fit: (v) => {
      const f = [];
      if (/i9|ryzen 9|ultra 9|m3 max|m4/i.test(v)) f.push({ group: 'Power users / creators', fit: 'high' });
      if (/i5|ryzen 5|ultra 5|m3|m4/i.test(v)) f.push({ group: 'Students & professionals', fit: 'high' });
      if (/i3|ryzen 3|gy|pentium|cortex/i.test(v)) f.push({ group: 'Budget buyers', fit: 'good' });
      return f;
    },
  },
  {
    keys: ['graphics', 'gpu', 'display card'],
    label: 'Graphics',
    explanation: (v) => `GPU: ${clean(v)}. ${/rtx|gaming|discrete|3060|4070|4090|4060|3050/i.test(v) ? 'Dedicated graphics — required for modern gaming and GPU-accelerated video/3D work.' : /integrated|iris|uhd|adreno|mali/i.test(v) ? 'Integrated graphics — fine for office, streaming and light games; heavy titles will struggle.' : 'No explicit GPU stated — treat heavy-graphics ambitions as unverified.'}`,
    fit: (v) => {
      const f = [];
      if (/(rtx|gtx|radeon rx)|\bdiscrete\b/i.test(v)) f.push({ group: 'Gamers & creators', fit: 'high', why: 'A dedicated GPU is what runs modern games and renders fast.' });
      if (/integrated|iris|uhd|adreno|mali/i.test(v)) f.push({ group: 'Casual & office', fit: 'high', why: 'Light visuals are effortless; skip AAA gaming.' });
      return f;
    },
  },
  {
    keys: ['display', 'screen', 'resolution', 'panel'],
    label: 'Display',
    explanation: (v) => `${/\d+k/i.test(v) ? 'Sharp high-resolution display' : 'Display'} — ${/120|144|165/i.test(v) ? 'high refresh rate makes motion feel fluid — great for gaming and scrolling.' : /oled|amoled/i.test(v) ? 'OLED-grade contrast with deep blacks and vivid color.' : 'Standard panel quality — check real-world reviews for brightness.'}`,
    fit: (v) => {
      const f = [];
      if (/120|144|165/i.test(v)) f.push({ group: 'Gamers', fit: 'high', why: 'High refresh smoothness matters in fast titles.' });
      if (/(lcd|ipo|60hz)/i.test(v)) f.push({ group: 'Budget users', fit: 'good', why: 'Plenty for browsing, documents and casual video.' });
      if (/(color|srgb|dci-p3)/i.test(v)) f.push({ group: 'Photo & video creators', fit: 'good' });
      return f;
    },
  },
  {
    keys: ['battery', 'battery capacity'],
    label: 'Battery',
    explanation: (v) => {
      const mAh = parseFloat(String(v).replace(/[^\d.]/g, ''));
      if (!mAh) return null;
      if (mAh >= 5000) return `${clean(v)} battery — a full-day battery for most workloads; heavy use still gets you deep into the evening.`;
      if (mAh >= 4000) return `${clean(v)} battery — a solid day. On video, media or GPS-heavy days you may charge before night.`;
      return `${clean(v)} battery — light; keep a charger nearby for travel-heavy days.`;
    },
    fit: (v) => {
      const mAh = Number(String(v).replace(/[^\d.]/g, ''));
      const f = [];
      if (mAh >= 5000) f.push({ group: 'Heavy away from chargers', fit: 'high', why: 'Battery-first design prioritizes staying offline.' });
      if (mAh >= 4000) f.push({ group: 'Daily commuters', fit: 'good' });
      if (mAh > 0 && mAh < 4000) f.push({ group: 'Casual users', fit: 'good', why: 'Fine for short sessions and plugged-in desks.' });
      return f;
    },
  },
  {
    keys: ['camera', 'rear camera', 'front camera', 'megapixels'],
    label: 'Camera',
    explanation: (v) => {
      const mp = String(v).match(/(\d+)\s*(?:mp|megapixel)/i);
      const big = mp && Number(mp[1]) >= 48;
      return `${clean(v)} camera setup. ${big ? 'High-resolution cameras — strong versatility in good light; processing quality matters more than pure MP these days.' : 'Standard sensor count. Real quality depends on software and lenses, not the megapixel number.'}`;
    },
    fit: (v) => {
      const f = [];
      if (/triple|quad|ultrawide|periscope|macro/i.test(v)) f.push({ group: 'Photography hobbyists', fit: 'good' });
      if (/macro/i.test(v)) f.push({ group: 'Casual shooters', fit: 'good' });
      return f;
    },
  },
  {
    keys: ['weight'],
    label: 'Weight',
    explanation: (v) => {
      const g = Number(String(v).replace(/[^\d.]/g, ''));
      if (!g) return null;
      if (g < 220) return `${clean(v)} — light, disappears in the hand on long sessions.`;
      if (g < 260) return `${clean(v)} — balanced. Weighs little for a full-size device.`;
      return `${clean(v)} — on the heavier side, but often matched with a bigger battery/screen.`;
    },
    fit: (v) => {
      const g = Number(String(v).replace(/[^\d.]/g, ''));
      if (g && g < 220) return [{ group: 'Musicians / travelers', fit: 'high', why: 'Lightest weight = most portable.' }];
      if (g && g >= 260) return [{ group: 'Battery-first users', fit: 'good', why: 'Heavier usually means a bigger battery.' }];
      return [];
    },
  },
  {
    keys: ['water', 'waterproof', 'splash'],
    label: 'Water resistance',
    explanation: (v) => {
      const ip = String(v).match(/\bIP\s?([0-9Xx]{2,3})\b/i);
      if (ip) return `${clean(v)} — ${ip[1].startsWith('6') && ip[1][1] >= '7' ? 'can take submersion; your worst enemy becomes dust and heat.' : ip[1][0] >= '5' ? 'splash-proof — survives rain and accidental spills but not submersion.' : 'basic rating — keeps light splashes out, not more.'}`;
      return `Water resistance: ${clean(v) || 'not specified'}. If this matters, confirm the IP rating — you can\'t claim force when pages don\'t state one.`;
    },
  },
  {
    keys: ['warranty', 'warranty period', 'warranty'],
    label: 'Warranty',
    explanation: (v) => `Warranty: ${clean(v)}. ${/(1\s*year|12\s*months)/i.test(v) ? 'Standard coverage — enough for most; prise for the category.' : /(\d\s*year|36\s*months)/i.test(v) ? 'Above-average coverage — a genuinely good safety net.' : 'Vernown terms — read the fine print.'}`,
    fit: (v) => [],
  },
  {
    keys: ['connectivity', 'bluetooth', 'ports', 'usb', 'jack'],
    label: 'Connectivity & Ports',
    explanation: (v) => `${clean(v)} — the ports and radios you get. Check your existing perches (or lack of a headphone jack) against this list.`,
    fit: (v) => [],
  },
];

const GENERIC_HOOKS = [
  { hook: /\d+\s?gb ram/i, label: 'RAM' },
];

function clean(v) {
  return String(v || '').replace(/\s+/g, ' ').trim();
}

function parseGb(v) {
  const n = parseInt(String(v || '').replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function isSsd(v) {
  return /ssd|nvme|m\.2/i.test(String(v || ''));
}

function allEntries(specsObj, specRows) {
  const out = {};
  for (const row of specRows || []) {
    if (row && row.label && row.value && !out[row.label]) out[row.label] = row.value;
  }
  for (const [k, v] of Object.entries(specsObj || {})) {
    if (!out[k] && v != null && v !== '') out[k] = v;
  }
  return out;
}

function matchLabel(label) {
  const l = label.toLowerCase();
  return SPEC_KNOWLEDGE.find((kb) => kb.keys.some((k) => l.includes(k)));
}

/** @returns { title, description, key, fits: [] }[] */
function explainSpecs(specsObj, specRows) {
  const all = allEntries(specsObj, specRows);
  const out = [];
  for (const [label, value] of Object.entries(all)) {
    const kb = matchLabel(label);
    if (kb) {
      const explanation = typeof kb.explanation === 'function' ? kb.explanation(value) : null;
      out.push({
        key: kb.label.toLowerCase().replace(/\s+/g, '-'),
        label: kb.label,
        rawLabel: label,
        value: clean(value),
        explanation: explanation || `${clean(value)} is the ${label} — check how it behaves in real use before deciding.`,
        fits: (typeof kb.fit === 'function' ? kb.fit(value) : []).concat([]),
      });
    } else {
      out.push({
        key: label, label,
        rawLabel: label,
        value: clean(value),
        explanation: null,
        fits: [],
      });
    }
  }
  // Deterministic ordering: known first, then others, cap
  return out.sort((a, b) => (a.explanation ? -1 : 1) - (b.explanation ? -1 : 1)).slice(0, 30);
}

module.exports = { explainSpecs, clean, parseGb };