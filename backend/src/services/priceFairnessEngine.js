function calculateFairPrice(product, priceHistory = []) {
  const prices = priceHistory.filter(p => p.price > 0).map(p => p.price);
  const currentPrice = product.price;

  const lowestEver = prices.length > 0 ? Math.min(...prices) : currentPrice;
  const highestEver = prices.length > 0 ? Math.max(...prices) : currentPrice;
  const averagePrice = prices.length > 0 ? prices.reduce((s, p) => s + p, 0) / prices.length : currentPrice;

  const originalPrice = product.originalPrice || highestEver;

  const discountPercent = originalPrice > 0 ? Math.round((1 - currentPrice / originalPrice) * 100) : 0;

  const savings = originalPrice - currentPrice;

  let verdict;
  let score;
  if (currentPrice <= lowestEver * 1.05) {
    verdict = 'Excellent Deal';
    score = 95;
  } else if (currentPrice <= averagePrice * 0.9) {
    verdict = 'Great Deal';
    score = 85;
  } else if (currentPrice <= averagePrice) {
    verdict = 'Good Deal';
    score = 75;
  } else if (currentPrice <= averagePrice * 1.1) {
    verdict = 'Fair';
    score = 60;
  } else if (currentPrice <= highestEver * 0.95) {
    verdict = 'Slightly Overpriced';
    score = 40;
  } else {
    verdict = 'Overpriced';
    score = 20;
  }

  const expectedTrend = prices.length > 5
    ? prices[prices.length - 1] < prices[0] ? 'downward'
      : prices[prices.length - 1] > prices[0] * 1.1 ? 'upward'
      : 'stable'
    : 'stable';

  const expectedSavings = expectedTrend === 'downward'
    ? Math.round(currentPrice * 0.15)
    : expectedTrend === 'upward'
      ? 0
      : Math.round(currentPrice * 0.05);

  return {
    currentPrice,
    fairPrice: Math.round(averagePrice),
    lowestEver,
    highestEver,
    averagePrice: Math.round(averagePrice),
    discountPercent,
    savings: Math.round(savings),
    expectedSavings,
    verdict,
    fairnessScore: score,
    expectedTrend,
    priceHistory: priceHistory.map(p => ({ date: p.date, price: p.price })),
    confidencePercentage: Math.round(prices.length > 10 ? 85 : prices.length > 5 ? 70 : 50 + prices.length * 5),
  };
}

module.exports = { calculateFairPrice };
