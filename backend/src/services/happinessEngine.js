function estimateHappiness(product, userSuitability, priceFairness) {
  const reviewScore = (product.rating / 5) * 25;
  const durabilityScore = (product.durabilityScore || 50) / 100 * 20;
  const fairnessScore = (priceFairness?.fairnessScore || 50) / 100 * 20;
  const suitabilityScore = (userSuitability?.score || 50) / 100 * 20;
  const returnRateScore = product.returnRate !== null && product.returnRate !== undefined
    ? Math.max(0, (1 - product.returnRate / 10)) * 15
    : 10;

  const total = Math.round(reviewScore + durabilityScore + fairnessScore + suitabilityScore + returnRateScore);
  const clampedScore = Math.min(100, Math.max(0, total));

  return {
    expectedSatisfaction: clampedScore,
    score: clampedScore,
    breakdown: { reviewScore, durabilityScore, fairnessScore, suitabilityScore, returnRateScore },
    summary: clampedScore >= 85 ? 'Highly likely to be satisfied'
      : clampedScore >= 70 ? 'Likely to be satisfied'
      : clampedScore >= 50 ? 'Mixed expectations'
      : 'Low satisfaction expected',
  };
}

module.exports = { estimateHappiness };
