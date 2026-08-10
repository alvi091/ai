const WEIGHTS = {
  comfort: 0.25,
  budgetMatch: 0.20,
  userPreferences: 0.15,
  weatherMatch: 0.10,
  reviewQuality: 0.10,
  durability: 0.10,
  brandAffinity: 0.05,
  popularity: 0.05,
};

function scoreComfort(product, intent) {
  const base = (product.comfortScore || 50) / 100;
  if (intent.priority === 'Comfort') return Math.min(base + 0.2, 1);
  return base;
}

function scoreBudget(product, intent) {
  const max = intent.max_budget || intent.budget || Infinity;
  const min = intent.min_budget || 0;
  if (product.price > max) return 0;
  if (product.price < min) return 0.3;
  if (product.price <= max * 0.3) return 0.8;
  if (product.price <= max * 0.6) return 1.0;
  if (product.price <= max * 0.85) return 0.9;
  return 0.7;
}

function scorePreferences(product, intent, user) {
  let score = 0.5;
  if (!user) return score;
  const brands = (user.preferredBrands || '').split(',').map(b => b.trim().toLowerCase());
  if (brands.includes(product.brand.toLowerCase())) score += 0.3;
  const colors = (user.favoriteColors || '').split(',').map(c => c.trim().toLowerCase());
  if (colors.length > 0 && product.colors) {
    const prodColors = product.colors.split(',').map(c => c.trim().toLowerCase());
    if (prodColors.some(c => colors.includes(c))) score += 0.2;
  }
  return Math.min(score, 1);
}

function scoreWeather(product, intent) {
  if (!intent.weather) return 0.5;
  const w = intent.weather.toLowerCase();
  let score = 0.5;
  if ((w.includes('winter') || w.includes('cold')) && product.winterScore) score += (product.winterScore / 100) * 0.5;
  if ((w.includes('rain') || w.includes('wet')) && product.waterproof) score += 0.4;
  return Math.min(score, 1);
}

function scoreReviews(product) {
  return Math.min(product.rating / 5, 1);
}

function scoreDurability(product) {
  return Math.min((product.durabilityScore || 50) / 100, 1);
}

function scoreBrand(product, intent) {
  if (!intent.brand_preference) return 0.5;
  return product.brand.toLowerCase() === intent.brand_preference.toLowerCase() ? 1 : 0.2;
}

function scorePopularity(product) {
  const reviewScore = Math.min((product.reviews || 0) / 500, 1);
  return reviewScore * 0.5 + (product.rating / 5) * 0.5;
}

function calculateSuitability(product, intent, user = null) {
  const scores = {
    comfort: scoreComfort(product, intent),
    budgetMatch: scoreBudget(product, intent),
    userPreferences: scorePreferences(product, intent, user),
    weatherMatch: scoreWeather(product, intent),
    reviewQuality: scoreReviews(product),
    durability: scoreDurability(product),
    brandAffinity: scoreBrand(product, intent),
    popularity: scorePopularity(product),
  };

  const total = Object.keys(WEIGHTS).reduce((sum, key) => {
    return sum + (scores[key] || 0) * WEIGHTS[key];
  }, 0);

  const breakdown = Object.keys(WEIGHTS).map(key => ({
    name: key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim(),
    score: Math.round((scores[key] || 0) * 100),
    weight: WEIGHTS[key] * 100,
    contribution: Math.round(((scores[key] || 0) * WEIGHTS[key]) / total * 100),
  }));

  return {
    score: Math.round(total * 100),
    breakdown,
    verdict: total >= 0.8 ? 'excellent' : total >= 0.6 ? 'good' : total >= 0.4 ? 'fair' : 'poor',
  };
}

module.exports = { calculateSuitability, WEIGHTS };
