/*
 * Persona engine — "who should buy" / "who should avoid".
 *
 * Builds the audience lists from category fit, spec-driven fit rules, price band
 * and review complaints. Deterministic heuristics; the LLM may refine wording
 * upstream but never the underlying logic.
 */

const PERSONAS = {
  student: { label: 'Students', icon: 'book' },
  developer: { label: 'Developers', icon: 'code' },
  gamer: { label: 'Gamers', icon: 'gamepad' },
  professional: { label: 'Professionals', icon: 'briefcase' },
  travel: { label: 'Travelers', icon: 'plane' },
  office: { label: 'Office workers', icon: 'building' },
  photography: { label: 'Photographers', icon: 'camera' },
  fitness: { label: 'Fitness users', icon: 'dumbbell' },
  parents: { label: 'Parents', icon: 'baby' },
  business: { label: 'Business owners', icon: 'briefcase' },
  creator: { label: 'Content creators', icon: 'video' },
  casual: { label: 'Casual users', icon: 'smile' },
  skincare: { label: 'Skincare enthusiasts', icon: 'sparkles' },
  haircare: { label: 'Haircare focused', icon: 'droplets' },
  oily_skin: { label: 'Oily skin types', icon: 'droplet' },
  sensitive: { label: 'Sensitive skin', icon: 'shield' },
  budget: { label: 'Budget-conscious buyers', icon: 'wallet' },
  premium: { label: 'Premium buyers', icon: 'crown' },
  men: { label: 'Men', icon: 'user' },
  women: { label: 'Women', icon: 'user' },
};

const CATEGORY_MAP = [
  { re: /laptop|computer|macbook|notebook/i, personas: ['developer', 'student', 'professional', 'creator'] },
  { re: /phone|smartphone|mobile/i, personas: ['casual', 'travel', 'student', 'professional', 'parents'] },
  { re: /headphone|earbud|earphone|speaker|sound/i, personas: ['travel', 'office', 'gamer', 'casual'] },
  { re: /tv|television|soundbar|home.?theatre/i, personas: ['parents', 'office', 'casual'] },
  { re: /gaming|console|controller/i, personas: ['gamer'] },
  { re: /camera|dslr|mirrorless|drone/i, personas: ['photography', 'creator', 'travel'] },
  { re: /shoe|sneaker|running|sports/i, personas: ['fitness', 'travel', 'casual'] },
  { re: /gym|fitness|yoga|dumbbell|treadmill/i, personas: ['fitness'] },
  { re: /watch|smartwatch|band/i, personas: ['fitness', 'professional', 'casual'] },
  { re: /furniture|sofa|desk|chair/i, personas: ['office', 'parents', 'business'] },
  { re: /kitchen|blender|cookware|refrigerator/i, personas: ['parents', 'casual'] },
  { re: /shampoo|conditioner|hair.?oil|hair.?serum|hair.?mask|hair.?treatment/i, personas: ['haircare', 'skincare', 'women', 'men'] },
  { re: /face.?wash|cleanser|moisturizer|sunscreen|serum|toner|scrub|face.?cream|face.?pack/i, personas: ['skincare', 'oily_skin', 'sensitive', 'women', 'men'] },
  { re: /soap|body.?wash|lotion|cream|deodorant|perfume|fragrance/i, personas: ['skincare', 'casual', 'men', 'women'] },
  { re: /makeup|lipstick|foundation|concealer|eyeliner|blush|mascara/i, personas: ['premium', 'women', 'creator'] },
  { re: /dandruff|anti.?dandruff|scalp/i, personas: ['haircare', 'sensitive', 'men', 'women'] },
  { re: /acne|pimple|pigmentation|dark.?spot|brightening/i, personas: ['skincare', 'sensitive', 'men', 'women'] },
];

function specText(product, rows, specsObj) {
  const parts = [product.title || '', product.description || ''];
  for (const r of rows || []) parts.push(`${r.label || ''} ${r.value || ''}`);
  for (const [k, v] of Object.entries(specsObj || {})) parts.push(`${k} ${v}`);
  return parts.join(' ').toLowerCase();
}

function categoryKeys(product) {
  const hay = `${product.title || ''} ${product.category || ''} ${product.description || ''}`;
  for (const c of CATEGORY_MAP) {
    if (c.re.test(hay)) return c.personas.slice();
  }
  return ['casual'];
}

function personaItem(key, fit, why) {
  const base = PERSONAS[key] || { label: key, icon: 'user' };
  return { key, label: base.label, icon: base.icon, fit, why };
}

function dedupeByKey(list) {
  const map = new Map();
  for (const item of list) map.set(item.key, item);
  return [...map.values()];
}

function specFitItems(product, specRows, specsObj) {
  const text = specText(product, specRows, specsObj);
  const fits = [];
  const isBeauty = /shampoo|face.?wash|soap|cream|lotion|serum|moisturizer|sunscreen|makeup|skincare|haircare|dandruff|acne|pimple/i.test(text);

  const ram = text.match(/\b(\d{1,3})\s?gb\s?ram\b/i);
  const hasGpu = /(rtx|gtx|radeon\s?rx|\barc\b)/i.test(text);
  const battery = text.match(/\b(\d{4,5})\s?mah\b/i);
  const weightKg = text.match(/(\d(?:\.\d)?)\s?kg\b/i);
  const isWaterproof = /(waterproof|splash.?proof|rain|\bipx[6-8]\b)/i.test(text);
  const camera = text.match(/\b(\d{2,3})\s?mp\b/i);
  const refresh = text.match(/\b(\d{3})\s?hz\b/i);
  const price = Number(product.price);

  if (ram) {
    const n = Number(ram[1]);
    if (n >= 16) fits.push(personaItem('developer', 'high', `${n} GB RAM powers big projects and containers`));
    if (n >= 12) fits.push(personaItem('creator', 'high', `${n} GB RAM helps editing and compiling`));
    if (n >= 8) {
      fits.push(personaItem('student', 'good', `${n} GB RAM handles coursework easily`));
      fits.push(personaItem('casual', 'good', `${n} GB RAM keeps everyday apps fast`));
    }
  }
  if (hasGpu) {
    fits.push(personaItem('gamer', 'high', 'Dedicated graphics cover modern titles'));
    fits.push(personaItem('creator', 'good', 'GPU assists video/3D acceleration'));
  }
  if (camera && Number(camera[1]) >= 48) {
    fits.push(personaItem('photography', 'good', `${camera[1]} MP-class camera hardware`));
    fits.push(personaItem('travel', 'good', 'Reliable pocket camera for trips'));
  }
  if (refresh && Number(refresh[1]) >= 90) fits.push(personaItem('gamer', 'good', 'High refresh display smooths motion'));
  if (isWaterproof) fits.push(personaItem('fitness', 'high', 'Water resistance survives workouts'));
  if (weightKg && Number(weightKg[1]) <= 1.4) {
    fits.push(personaItem('travel', 'high', `Only ${weightKg[1]} kg \u2014 genuinely portable`));
    fits.push(personaItem('office', 'good', 'Easy to carry between desks'));
  }
  if (battery && Number(battery[1]) >= 5000) fits.push(personaItem('travel', 'high', 'Large battery for away-from-charge days'));

  // Only add price-based personas for tech products, not beauty/skincare
  if (!isBeauty && price && price > 0 && price <= 300) fits.push(personaItem('student', 'good', 'Sits inside most student budgets'));

  // Beauty-specific price personas
  if (isBeauty && price && price > 0) {
    if (price <= 300) fits.push(personaItem('budget', 'high', 'Affordable everyday essential'));
    else if (price >= 800) fits.push(personaItem('premium', 'good', 'Premium formulation for discerning buyers'));
  }

  return fits;
}

function avoidItems(product, analyzed) {
  const avoid = [];
  const text = specText(product, [], {});
  const price = Number(product.price) || null;
  const complaints = (analyzed && analyzed.complaints) || [];

  if (price && price > 60000 && !/photo|camera|creator|gamer/.test(text)) {
    avoid.push(personaItem('student', 'avoid', 'High cost versus typical student budgets'));
    avoid.push(personaItem('casual', 'avoid', 'Pays for pro features casual use ignores'));
  }
  if (complaints.some((c) => c.key === 'durability')) {
    avoid.push(personaItem('travel', 'avoid', 'Reliability doubts argue against portable use'));
  }
  if (complaints.some((c) => c.key === 'comfort')) {
    avoid.push(personaItem('professional', 'avoid', 'Comfort complaints clash with all-day wear'));
  }
  if (complaints.some((c) => c.key === 'battery')) {
    avoid.push(personaItem('travel', 'avoid', 'Battery complaints cut travel sessions short'));
  }
  if (complaints.some((c) => c.key === 'build')) {
    avoid.push(personaItem('business', 'avoid', 'Build complaints risk frequent downtime'));
  }
  return dedupeByKey(avoid);
}

function build(product, { specRows = [], specsObj = null, analyzed = null } = {}) {
  const catItems = categoryKeys(product).map((k) => personaItem(k, 'good', 'Matches the product\u2019s category use'));
  const specItems = specFitItems(product, specRows || [], specsObj || {});
  const combined = dedupeByKey([...catItems, ...specItems]);

  const fitScore = { high: 90, good: 72, ok: 55, avoid: 20 };
  const shouldBuy = combined
    .filter((i) => i.fit !== 'avoid')
    .map((i) => ({ ...i, _score: fitScore[i.fit] || 55 }))
    .sort((a, b) => b._score - a._score)
    .slice(0, 5)
    .map(({ _score, ...rest }) => rest);

  const avoid = avoidItems(product, analyzed).slice(0, 4);

  return {
    shouldBuy: shouldBuy.map((s) => ({ key: s.key, label: s.label, icon: s.icon, fit: s.fit, why: s.why })),
    shouldAvoid: avoid.map((a) => ({ key: a.key, label: a.label, icon: a.icon, why: a.why })),
    confidence: specItems.length ? 72 : 45,
  };
}

module.exports = { build, PERSONAS };
