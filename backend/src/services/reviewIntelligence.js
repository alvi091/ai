const AIService = require('../ai/AIService');

function extractReviewMetrics(product) {
  let reviewSamples = [];
  try {
    reviewSamples = product.reviewSamples ? JSON.parse(product.reviewSamples) : [];
  } catch { reviewSamples = []; }

  const count = product.reviews || reviewSamples.length || 0;
  const rating = product.rating || 0;

  const positive = rating >= 4 ? Math.round(count * (rating / 5) * 0.8) : Math.round(count * 0.3);
  const negative = rating <= 2 ? Math.round(count * 0.6) : rating <= 3 ? Math.round(count * 0.2) : Math.round(count * 0.1);
  const neutral = count - positive - negative;

  const lovedFeatures = [];
  const complainedFeatures = [];
  const commonProblems = [];

  for (const review of reviewSamples.slice(0, 30)) {
    const text = (review.comment || review.text || '').toLowerCase();
    const rRating = review.rating || 0;
    if (rRating >= 4) {
      if (text.includes('comfort')) lovedFeatures.push('Comfort');
      if (text.includes('durable') || text.includes('quality')) lovedFeatures.push('Build Quality');
      if (text.includes('design') || text.includes('look')) lovedFeatures.push('Design');
      if (text.includes('lightweight')) lovedFeatures.push('Lightweight');
      if (text.includes('value') || text.includes('worth')) lovedFeatures.push('Value');
    }
    if (rRating <= 2) {
      if (text.includes('size') || text.includes('fit') || text.includes('small') || text.includes('tight')) complainedFeatures.push('Sizing Issues');
      if (text.includes('break') || text.includes('defect') || text.includes('poor quality')) complainedFeatures.push('Quality Issues');
      if (text.includes('uncomfortable') || text.includes('pain')) complainedFeatures.push('Comfort Issues');
      if (text.includes('expensive') || text.includes('overpriced')) complainedFeatures.push('Price');
      if (text.includes('battery') || text.includes('charge')) complainedFeatures.push('Battery Life');
      if (text.includes('noise')) complainedFeatures.push('Noise');
    }
  }

  return {
    summary: {
      totalReviews: count,
      averageRating: rating,
      positivePercent: count > 0 ? Math.round((positive / count) * 100) : 0,
      negativePercent: count > 0 ? Math.round((negative / count) * 100) : 0,
      neutralPercent: count > 0 ? Math.round((neutral / count) * 100) : 0,
    },
    mostLovedFeatures: [...new Set(lovedFeatures)].slice(0, 5),
    mostComplainedFeatures: [...new Set(complainedFeatures)].slice(0, 5),
    commonProblems: [...new Set(commonProblems)].slice(0, 5),
    longTermExperience: rating >= 4 ? 'Generally positive long-term ownership' : 'Mixed long-term experiences reported',
    comfortSummary: product.comfortScore > 70 ? 'Highly rated for comfort' : product.comfortScore > 40 ? 'Adequate comfort' : 'Comfort concerns reported',
    durabilitySummary: product.durabilityScore > 70 ? 'Excellent durability reported' : product.durabilityScore > 40 ? 'Average durability' : 'Durability concerns',
    reviewConfidence: count > 100 ? 90 : count > 50 ? 80 : count > 20 ? 65 : 50,
  };
}

async function getAISummary(product) {
  try {
    const aiService = AIService.create('gemini');
    let reviews = [];
    try { reviews = product.reviewSamples ? JSON.parse(product.reviewSamples).map(r => `[${r.rating}/5] ${r.comment || r.text}`) : []; } catch {}
    return await aiService.summarizeReviews(product.name, reviews);
  } catch {
    return null;
  }
}

module.exports = { extractReviewMetrics, getAISummary };
