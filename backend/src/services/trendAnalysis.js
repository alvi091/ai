function analyzePriceTrend(priceHistory = [], currentPrice = null) {
  const points = (priceHistory || [])
    .filter((p) => p && Number(p.price) > 0)
    .map((p) => ({ date: p.date, price: Number(p.price) }));

  if (points.length === 0) {
    return {
      present: false,
      direction: 'unknown',
      signalStrength: 0,
      nearLow: false,
      nearHigh: false,
      positionPercent: null,
    };
  }

  const prices = points.map((p) => p.price);
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  const first = prices[0];
  const last = prices[prices.length - 1];
  const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
  const range = high - low;

  const curr = currentPrice != null ? Number(currentPrice) : last;
  const changePercent = first > 0 ? ((last - first) / first) * 100 : 0;
  const currentPercent = range > 0 ? ((curr - low) / range) * 100 : 50;

  const recent = prices.slice(-Math.min(5, prices.length));
  const momentum = recent.length > 1 ? (recent[recent.length - 1] - recent[0]) / recent[0] : 0;

  const stdev = Math.sqrt(prices.reduce((s, p) => s + (p - avg) ** 2, 0) / prices.length);
  const cv = avg > 0 ? stdev / avg : 0;
  const volatility = cv > 0.25 ? 'high' : cv > 0.1 ? 'moderate' : 'low';

  let direction = 'stable';
  if (changePercent < -5) direction = 'downward';
  else if (changePercent > 5) direction = 'upward';

  let momentumDir = 'flat';
  if (momentum < -0.03) momentumDir = 'falling';
  else if (momentum > 0.03) momentumDir = 'rising';

  const windowDays = points.length;
  const signalStrength = Math.min(100, Math.round(windowDays * 3.5 + (range > 0 ? 20 : 5)));

  const nearLow = curr <= low * 1.06;
  const nearHigh = curr >= high * 0.94;

  const forecastDirection =
    direction === 'downward' ? 'downward' : direction === 'upward' ? 'upward' : 'stable';
  const forecastHint = {
    direction: forecastDirection,
    range: {
      low: Math.round(low),
      high: Math.round(high),
    },
  };

  return {
    present: true,
    windowDays,
    low,
    high,
    first,
    last,
    avg: Math.round(avg),
    changePercent: Math.round(changePercent * 10) / 10,
    direction,
    momentum: momentumDir,
    momentumValue: Math.round(momentum * 100) / 100,
    volatility,
    nearLow,
    nearHigh,
    positionPercent: Math.round(currentPercent),
    signalStrength,
    forecastHint,
    descriptors: {
      directionWord: direction === 'downward' ? 'falling' : direction === 'upward' ? 'rising' : 'flat',
      volatilityWord: volatility === 'high' ? 'jumpy' : volatility === 'moderate' ? 'wobbly' : 'steady',
    },
  };
}

function analyzeReviewSentiment(reviews = [], overallRating = 0) {
  const list = (reviews || []).filter((r) => r && typeof r.rating === 'number');
  if (list.length < 2) {
    return { present: false, shift: 'none', recentAvg: null, overallAvg: overallRating || null };
  }

  const sorted = [...list].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  const recentCount = Math.min(10, Math.ceil(sorted.length * 0.25));
  const recent = sorted.slice(-recentCount);
  const recentAvg = recent.reduce((s, r) => s + r.rating, 0) / recent.length;
  const overallAvg = list.reduce((s, r) => s + r.rating, 0) / list.length;
  const diff = recentAvg - overallAvg;

  let shift = 'none';
  if (diff > 0.25) shift = 'improving';
  else if (diff < -0.25) shift = 'declining';

  return { present: true, shift, recentAvg, overallAvg, recentCount, diff: Math.round(diff * 10) / 10 };
}

module.exports = { analyzePriceTrend, analyzeReviewSentiment };
