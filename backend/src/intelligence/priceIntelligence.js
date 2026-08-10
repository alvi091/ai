/*
 * Price intelligence — current price vs MRP, discount, fairness, volatility,
 * best-time-to-buy, seasonality and a *clearly labeled estimated* trend.
 * Deterministic heuristics; confidence reflects how strong the signals are.
 */

const CATEGORY_SEASONS = [
  { label: 'Electronics & gadgets', category: /laptop|phone|smartphone|tv|television|headphone|tablet|monitor|smartwatch|camera/i, bestTime: 'festive sales (Oct\u2013Nov) and right after model launches', rangeMonths: [9, 10, 11] },
  { label: 'Fashion & footwear', category: /shoe|sneaker|shirt|jeans|dress|jacket|hoodie|watch|fashion/i, bestTime: 'end-of-season clearance (Jun\u2013Jul) and New Year sales', rangeMonths: [5, 6, 7, 11] },
  { label: 'Fitness', category: /gym|yoga|dumbbell|treadmill|cycling|fitness/i, bestTime: 'the New Year fitness push (Jan) and summer sports sales', rangeMonths: [0, 5, 6, 7] },
  { label: 'Home & kitchen', category: /furniture|sofa|air conditioner|\bac\b|refrigerator|kitchen|blender|mattress|vacuum/i, bestTime: 'festive white-goods sales (Sep\u2013Nov)', rangeMonths: [8, 9, 10] },
];

function volatilityFrom(history) {
  const prices = (history || []).map((h) => Number(h.price)).filter((p) => Number.isFinite(p));
  if (prices.length < 3) return 'low';
  const mean = prices.reduce((s, p) => s + p, 0) / prices.length;
  const variance = prices.reduce((s, p) => s + (p - mean) ** 2, 0) / prices.length;
  const cv = mean ? Math.sqrt(variance) / mean : 0;
  if (cv < 0.04) return 'low';
  if (cv < 0.12) return 'medium';
  return 'high';
}

function percentileOf(value, prices) {
  const sorted = [...prices].sort((a, b) => a - b);
  const idx = sorted.findIndex((p) => p >= value);
  if (idx === -1) return 100;
  return Math.round((idx / sorted.length) * 100);
}

function quantile(prices, q) {
  if (!prices.length) return null;
  const sorted = [...prices].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  return sorted[base];
}

const FORMATTERS = {
  INR: (v) => '\u20B9' + Math.round(v).toLocaleString('en-IN'),
  USD: (v) => '$' + Math.round(v).toLocaleString('en-US'),
  EUR: (v) => '\u20AC' + Math.round(v).toLocaleString('en-US'),
};
function formatMoney(value, currency) {
  const fmt = FORMATTERS[String(currency || 'INR').toUpperCase()] || FORMATTERS.INR;
  return fmt(Number(value) || 0);
}

/**
 * Cross-store price comparison. `marketPrices` are similar products' current
 * prices from the catalog — the closest thing to a live market read.
 */
function marketRead(marketPrices) {
  const prices = (marketPrices || []).filter((v) => Number.isFinite(Number(v)) && Number(v) > 0).map(Number);
  if (prices.length < 3) return null;
  return {
    count: prices.length,
    median: quantile(prices, 0.5),
    low: quantile(prices, 0.25),
    high: quantile(prices, 0.75),
    percentile: null,
  };
}

function seasonality(text) {
  const s = CATEGORY_SEASONS.find((c) => c.category.test(text || ''));
  if (!s) return null;
  return { label: s.label, bestTime: s.bestTime, inSeason: s.rangeMonths.includes(new Date().getMonth()) };
}

function priceIntelligence(product, ctx = {}) {
  const price = Number(product.price);
  const hasPrice = Number.isFinite(price) && price > 0;
  const original = product.originalPrice && Number(product.originalPrice) > price ? Number(product.originalPrice) : null;
  const currency = product.currency || 'INR';

  let discountPercent = 0;
  if (original && hasPrice) discountPercent = Math.round(((original - price) / original) * 100);
  else if (Number.isFinite(ctx.estimatedDiscount)) discountPercent = ctx.estimatedDiscount;

  let fairnessScore = 55;
  const signals = [];
  if (original && hasPrice) {
    if (discountPercent >= 40 && discountPercent <= 60) { fairnessScore = 78; signals.push(`Discounted ${discountPercent}% below list \u2014 healthy deal depth`); }
    else if (discountPercent > 60) { fairnessScore = 68; signals.push(`Discount is very deep (${discountPercent}%) \u2014 check whether the list price is genuine`); }
    else if (discountPercent >= 15) { fairnessScore = 68; signals.push(`A modest ${discountPercent}% off list \u2014 decent, not screaming`); }
    else { fairnessScore = 48; signals.push('List price sits close to MRP \u2014 little room baked in'); }
  } else if (!hasPrice) {
    fairnessScore = 20;
    signals.push('No price could be read from the page \u2014 cannot judge fairness');
  } else {
    fairnessScore = 40;
    signals.push('No MRP reference captured \u2014 fairness is a guess');
  }

  // Blend in a cross-store market read when similar products are available —
  // but only when the product's own price is actually known.
  const market = hasPrice ? marketRead(ctx.marketPrices) : null;
  if (market) {
    const percentile = percentileOf(price, (ctx.marketPrices || []).map(Number));
    market.percentile = percentile;
    const marketScore = percentile <= 25 ? 88 : percentile <= 50 ? 74 : percentile <= 75 ? 58 : percentile <= 90 ? 42 : 30;
    const hadDiscountSignal = fairnessScore !== 55;
    fairnessScore = Math.round(fairnessScore * (hadDiscountSignal ? 0.4 : 0.3) + marketScore * (hadDiscountSignal ? 0.6 : 0.7));
    signals.push(
      percentile <= 25
        ? `Priced in the bottom ${percentile}% of ${market.count} comparable products \u2014 cheaper than most`
        : percentile <= 50
          ? `Sits near the median of ${market.count} comparable products (median ${formatMoney(market.median, currency)})`
          : percentile <= 75
            ? `Above the median of ${market.count} comparable products (median ${formatMoney(market.median, currency)})`
            : `Near the top of the range across ${market.count} comparable products \u2014 premium-priced`
    );
  }

  const volatility = (ctx.history && ctx.history.length >= 3) ? volatilityFrom(ctx.history) : 'low';

  const seasonNode = seasonality(`${product.title || ''} ${product.category || ''}`);
  let bestTimeToBuy;
  if (seasonNode) {
    bestTimeToBuy = seasonNode.inSeason
      ? 'You are inside the seasonal buying window now \u2014 the strongest coming discounts may already be here.'
      : `Historically ${seasonNode.bestTime} bring the deepest cuts. Outside that window, wait for a sale or watch for a fair-price dip.`;
  } else {
    bestTimeToBuy = 'No strong seasonal pattern observed; buy when the price looks fair to you.';
  }

  let priceTrend;
  if (ctx.history && ctx.history.length >= 3) {
    const first = Number(ctx.history[0].price);
    const last = Number(ctx.history[ctx.history.length - 1].price);
    const change = ((last - first) / first) * 100;
    priceTrend = { direction: change < -1 ? 'down' : change > 1 ? 'up' : 'stable', changePercent: Math.round(change), estimate: true };
  } else if (original && hasPrice && discountPercent >= 35) {
    priceTrend = { direction: 'down', changePercent: discountPercent, estimate: true, note: 'Priced well below list \u2014 the promotional path appears downward.' };
  } else {
    priceTrend = { direction: 'unknown', changePercent: null, estimate: true, note: 'No usable price history \u2014 the future trend cannot be estimated.' };
  }

  const savingsOpportunity = market && market.median
    ? (price < market.median ? market.median - price : original ? original - price : null)
    : original ? original - price : null;

  const confidence = (ctx.history && ctx.history.length >= 5) ? 70 : market ? 60 : 25;

  const fairRange = market
    ? { low: Math.round(market.low), high: Math.round(market.high), market: true }
    : original
      ? { low: Math.round(original * 0.55), high: Math.round(original * 0.9), market: false }
      : null;

  return {
    current: hasPrice ? price : null,
    original,
    discountPercent,
    currency,
    fairnessScore: Math.max(0, Math.min(100, Math.round(fairnessScore))),
    fairnessLabel: fairnessScore >= 75 ? 'Excellent price' : fairnessScore >= 55 ? 'Reasonable price' : fairnessScore >= 35 ? 'On the higher side' : 'Cannot judge',
    volatility,
    bestTimeToBuy,
    seasonality: seasonNode ? { label: seasonNode.label, inSeason: seasonNode.inSeason } : null,
    priceTrend,
    estimateLabel: true,
    savingsOpportunity,
    fairRange,
    market: market ? { count: market.count, median: Math.round(market.median), percentile: market.percentile } : null,
    history: ctx.history || [],
    confidence,
    notes: signals,
    source: 'computed',
  };
}

module.exports = { priceIntelligence, volatilityFrom, seasonality };