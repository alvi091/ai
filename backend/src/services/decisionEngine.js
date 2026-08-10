const AIService = require('../ai/AIService');

function calculateBuyDecision(product, priceHistory = []) {
  const prices = priceHistory.filter(p => p.price > 0).map(p => p.price);
  const currentPrice = product.price;
  const avgPrice = prices.length > 0 ? prices.reduce((s, p) => s + p, 0) / prices.length : currentPrice;
  const lowPrice = prices.length > 0 ? Math.min(...prices) : currentPrice;
  const highPrice = prices.length > 0 ? Math.max(...prices) : currentPrice;

  const discountPercent = product.originalPrice ? Math.round((1 - currentPrice / product.originalPrice) * 100) : 0;
  const trend = prices.length > 3
    ? prices[prices.length - 1] < prices[0] ? -1 : prices[prices.length - 1] > prices[0] * 1.1 ? 1 : 0
    : 0;

  const nearLow = currentPrice <= lowPrice * 1.08;
  const nearHigh = currentPrice >= highPrice * 0.95;
  const belowAvg = currentPrice <= avgPrice;
  const goodDiscount = discountPercent >= 20;

  const stockScore = product.stockLevel > 100 ? 10 : product.stockLevel > 50 ? 20 : product.stockLevel > 10 ? 30 : product.inStock ? 15 : 0;
  const reviewScore = product.rating >= 4.5 ? 20 : product.rating >= 4 ? 15 : product.rating >= 3.5 ? 10 : 5;
  const priceScore = nearLow ? 35 : belowAvg ? 25 : nearHigh ? 5 : 15;
  const discountScore = goodDiscount ? 20 : discountPercent >= 10 ? 10 : 5;
  const trendScore = trend === -1 ? 15 : trend === 0 ? 10 : 0;
  const seasonScore = 10;

  const totalScore = stockScore + reviewScore + priceScore + discountScore + trendScore + seasonScore;

  let decision;
  if (totalScore >= 80 && nearLow) decision = 'BUY_NOW';
  else if (totalScore >= 60) decision = 'BUY_NOW';
  else if (totalScore >= 45) decision = 'WAIT';
  else if (totalScore >= 30) decision = 'BUY_LATER';
  else decision = 'NOT_RECOMMENDED';

  const decisionLabels = {
    BUY_NOW: { label: 'Buy Now', color: 'green', icon: 'ThumbsUp' },
    WAIT: { label: 'Wait', color: 'yellow', icon: 'Clock' },
    BUY_LATER: { label: 'Buy Later', color: 'orange', icon: 'Calendar' },
    NOT_RECOMMENDED: { label: 'Not Recommended', color: 'red', icon: 'ThumbsDown' },
  };

  const reasons = [];
  if (nearLow) reasons.push('Price near 45-day low');
  if (belowAvg) reasons.push('Below average price');
  if (goodDiscount) reasons.push(`${discountPercent}% discount available`);
  if (trend === 1) reasons.push('Price trending upward — buy before it rises');
  if (trend === -1) reasons.push('Price trending downward — may drop further');
  if (nearHigh) reasons.push('Price near 45-day high — consider waiting');
  if (product.stockLevel !== null && product.stockLevel < 20) reasons.push('Low stock — only a few left');
  if (!product.inStock) reasons.push('Currently out of stock');

  const confidence = Math.min(totalScore, 100);
  const confidenceLabel = confidence >= 80 ? 'High Confidence' : confidence >= 60 ? 'Good Confidence' : confidence >= 40 ? 'Moderate Confidence' : 'Low Confidence';

  return {
    decision,
    ...decisionLabels[decision],
    confidence,
    confidencePercentage: confidence,
    confidenceLabel,
    reasons,
    score: totalScore,
    breakdown: { stockScore, reviewScore, priceScore, discountScore, trendScore, seasonScore },
    priceMetrics: { currentPrice, avgPrice: Math.round(avgPrice), lowPrice, highPrice, discountPercent },
  };
}

async function getGeminiDecision(product, intent) {
  try {
    const ai = AIService.create('gemini');
    return await ai.generateDecision(product, intent);
  } catch {
    return { decision: 'wait', explanation: '', confidence: 50, why_now: '' };
  }
}

module.exports = { calculateBuyDecision, getGeminiDecision };
