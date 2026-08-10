function calculateRegretScore(product, priceHistory = []) {
  const prices = priceHistory.filter(p => p.price > 0).map(p => p.price);
  const currentPrice = product.price;
  const avgPrice = prices.length > 0 ? prices.reduce((s, p) => s + p, 0) / prices.length : currentPrice;

  const reviewSentiment = product.rating >= 4.5 ? 10 : product.rating >= 4 ? 20 : product.rating >= 3.5 ? 35 : product.rating >= 3 ? 50 : 70;
  const returnRateScore = product.returnRate !== null && product.returnRate !== undefined
    ? product.returnRate * 10 : 30;
  const warrantyScore = product.warrantyScore > 70 ? 10 : product.warrantyScore > 40 ? 25 : 40;
  const durabilityScore = product.durabilityScore > 70 ? 10 : product.durabilityScore > 40 ? 25 : 40;
  const priceStability = prices.length > 3
    ? (Math.max(...prices) - Math.min(...prices)) / avgPrice > 0.3 ? 35 : 15
    : 25;
  const productAge = product.releaseDate
    ? Math.min((Date.now() - new Date(product.releaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365), 5) * 10
    : 20;

  const regretScore = Math.round(
    reviewSentiment * 0.3 +
    returnRateScore * 0.2 +
    warrantyScore * 0.15 +
    durabilityScore * 0.15 +
    priceStability * 0.1 +
    productAge * 0.1
  );

  const clampedScore = Math.min(100, Math.max(0, regretScore));

  let riskLabel;
  if (clampedScore <= 20) riskLabel = 'Very Low Risk';
  else if (clampedScore <= 40) riskLabel = 'Low Risk';
  else if (clampedScore <= 60) riskLabel = 'Moderate Risk';
  else riskLabel = 'High Risk';

  return {
    regretProbability: clampedScore,
    riskLabel,
    breakdown: {
      reviewSentiment, returnRate: returnRateScore, warranty: warrantyScore,
      durability: durabilityScore, priceStability, productAge,
    },
  };
}

module.exports = { calculateRegretScore };
