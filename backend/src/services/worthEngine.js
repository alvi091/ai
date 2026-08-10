function computeWorth({
  rating,
  reviewConfidence,
  priceFairness = {},
  trend = {},
  risk = {},
  popularity = {},
  categoryProfile = {},
  durabilityScore,
  warrantyScore,
}) {
  const ratingScore = Math.min((rating || 0) / 5, 1) * 30;
  const spreadPenalty = reviewConfidence > 0 && reviewConfidence < 50 ? Math.round((50 - reviewConfidence) * 0.4) : 0;

  const fairness = priceFairness.fairnessScore != null ? priceFairness.fairnessScore / 100 : 0.5;
  const fairnessScore = fairness * 20;

  let trendScore = 10;
  if (trend.direction === 'downward') trendScore = 17;
  else if (trend.direction === 'upward') trendScore = 5;
  else trendScore = 10;

  const riskScore = Math.max(0, 1 - ((risk.regretProbability || 50) / 100)) * 10;

  const popularityScore = Math.min((popularity.score || 50) / 100, 1) * 10;

  const durabilityScoreNorm = Math.min((durabilityScore || 50) / 100, 1) * 10;
  const warrantyScoreNorm = warrantyScore != null ? Math.min(warrantyScore / 100, 1) * 10 : 5;

  const total = Math.max(0, Math.min(100, Math.round(
    ratingScore - spreadPenalty + fairnessScore + trendScore + riskScore + popularityScore + durabilityScoreNorm + warrantyScoreNorm
  )));

  let tier;
  if (total >= 82) tier = 'excellent';
  else if (total >= 70) tier = 'good';
  else if (total >= 55) tier = 'fair';
  else if (total >= 40) tier = 'weak';
  else tier = 'poor';

  const label = {
    excellent: 'Genuinely strong buy on the merits',
    good: 'Solid, defensible purchase',
    fair: 'Acceptable, with clear caveats',
    weak: 'Hard to justify at this price',
    poor: 'Poor value across the board',
  }[tier];

  const drivers = [
    { factor: 'Review quality', score: Math.round(ratingScore - spreadPenalty), weight: 30, direction: ratingScore - spreadPenalty >= 22 ? 'positive' : 'negative' },
    { factor: 'Price fairness', score: Math.round(fairnessScore), weight: 20, direction: fairness >= 0.6 ? 'positive' : 'negative' },
    { factor: 'Price direction', score: trendScore, weight: 17, direction: trend.direction === 'downward' ? 'positive' : trend.direction === 'upward' ? 'negative' : 'neutral' },
    { factor: 'Buyer risk', score: Math.round(riskScore), weight: 10, direction: riskScore >= 6 ? 'positive' : 'negative' },
    { factor: 'Popularity', score: Math.round(popularityScore), weight: 10, direction: popularityScore >= 6 ? 'positive' : 'neutral' },
    { factor: 'Durability & warranty', score: Math.round(durabilityScoreNorm + warrantyScoreNorm), weight: 20, direction: (durabilityScoreNorm + warrantyScoreNorm) >= 12 ? 'positive' : 'neutral' },
  ];

  return { score: total, tier, label, drivers };
}

module.exports = { computeWorth };
