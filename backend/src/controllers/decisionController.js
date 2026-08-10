const prisma = require('../database');
const { asyncHandler } = require('../utils/asyncHandler');
const { calculateSuitability } = require('../services/suitabilityEngine');
const { calculateFairPrice } = require('../services/priceFairnessEngine');
const { calculateBuyDecision, getGeminiDecision } = require('../services/decisionEngine');
const { calculateMatchScore } = require('../services/matchScoreEngine');
const { calculateRegretScore } = require('../services/buyerRegretEngine');
const { estimateHappiness } = require('../services/happinessEngine');
const { analyzeLifecycle } = require('../services/productLifecycle');
const { extractReviewMetrics } = require('../services/reviewIntelligence');
const { generateWhyNotBuy } = require('../services/whyNotBuyEngine');
const { generateExplanation } = require('../services/decisionExplanation');
const { generateBundle } = require('../services/bundleEngine');
const { predictNextPurchases } = require('../services/predictionEngine');
const { getAccessories } = require('../services/accessoryEngine');
const { getRelevantQuestions, getAIQuestions } = require('../services/followUpService');
const { classifyPersona } = require('../services/personaEngine');
const { getMemory: getAIMemory, learnFromSearch, rememberViewedProduct } = require('../services/aiMemoryService');
const { trackEvent, trackRecommendationClick, trackSearch } = require('../services/analyticsService');
const { analyzeProduct } = require('../services/productAnalytics');
const { generateReport } = require('../services/reportBuilder');
const { enrichProduct } = require('../services/enrichedCatalog');
const AIService = require('../ai/AIService');

const aiService = AIService.create('gemini');

const getFullDecision = asyncHandler(async (req, res) => {
  const { productId, prompt } = req.body;
  if (!productId) return res.status(400).json({ error: 'productId required' });

  const product = await prisma.product.findUnique({ where: { id: String(productId) } });
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const priceHistory = await prisma.priceHistory.findMany({
    where: { productId },
    orderBy: { date: 'asc' },
  });

  const user = req.user ? await prisma.user.findUnique({ where: { id: req.user.id } }) : null;
  const intent = prompt ? { original_prompt: prompt } : {};

  const enriched = enrichProduct(product);

  const [categoryProducts, alternatives] = await Promise.all([
    prisma.product.findMany({ where: { category: product.category }, select: { id: true, name: true, price: true, rating: true, reviews: true, brand: true } }),
    prisma.product.findMany({
      where: { category: product.category, id: { not: product.id } },
      orderBy: { rating: 'desc' },
      take: 4,
      select: { id: true, name: true, brand: true, price: true, image: true, rating: true },
    }),
  ]);

  const suitability = calculateSuitability(product, intent, user);
  const priceFairness = calculateFairPrice(product, priceHistory);
  const buyDecision = calculateBuyDecision(product, priceHistory);
  const matchScore = calculateMatchScore(product, intent);
  const regret = calculateRegretScore(product, priceHistory);
  const happiness = estimateHappiness(product, suitability, priceFairness);
  const lifecycle = analyzeLifecycle(product);
  const reviewIntelligence = extractReviewMetrics(product);
  const whyNotBuy = generateWhyNotBuy(product, intent);
  const marketplace = product.marketplace || 'General';

  const explanation = generateExplanation(product, intent, suitability, alternatives);
  const accessories = await getAccessories(product);

  const analytics = analyzeProduct({
    product: enriched,
    priceHistory,
    categoryProducts,
    alternatives,
    user,
    intent,
    currency: product.currency || 'INR',
  });
  const aiReport = await generateReport(analytics, { user, intent, prompt, alternatives });

  let geminiDecision = null;
  if (prompt) {
    try { geminiDecision = await getGeminiDecision(product, { original_prompt: prompt }); } catch {}
  }

  await trackEvent(req.user?.id, 'decision_viewed', { productId, productName: product.name });

  const result = {
    product: {
      id: product.id, name: product.name, brand: product.brand, category: product.category,
      price: product.price, originalPrice: product.originalPrice, image: product.image,
      rating: product.rating, reviews: product.reviews, description: product.description,
      currency: product.currency || 'INR', marketplace: product.marketplace,
    },
    suitability,
    priceFairness,
    buyDecision,
    matchScore,
    buyerRegret: regret,
    happiness,
    lifecycle,
    reviewIntelligence,
    whyNotBuy,
    decisionExplanation: explanation,
    accessories,
    geminiDecision,
    aiReport,
    marketplace,
    alternatives: alternatives.map(a => ({
      id: a.id, name: a.name, brand: a.brand, price: a.price, image: a.image, rating: a.rating,
    })),
  };

  res.json({ decision: result });
});

const getSuitability = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const user = req.user ? await prisma.user.findUnique({ where: { id: req.user.id } }) : null;
  const intent = req.body?.prompt ? { original_prompt: req.body.prompt } : {};

  const suitability = calculateSuitability(product, intent, user);
  res.json({ suitability });
});

const getPriceFairness = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const priceHistory = await prisma.priceHistory.findMany({ where: { productId }, orderBy: { date: 'asc' } });
  res.json({ priceFairness: calculateFairPrice(product, priceHistory) });
});

const getBuyDecision = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const priceHistory = await prisma.priceHistory.findMany({ where: { productId }, orderBy: { date: 'asc' } });
  res.json({ buyDecision: calculateBuyDecision(product, priceHistory) });
});

const getMatchScore = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const intent = req.body?.prompt ? { original_prompt: req.body.prompt } : {};
  res.json({ matchScore: calculateMatchScore(product, intent) });
});

const getFollowUpQuestions = asyncHandler(async (req, res) => {
  const { prompt } = req.body;
  let intent = {};
  try { intent = await aiService.extractIntent(prompt || ''); } catch {}
  const questions = await getAIQuestions(intent);
  res.json({ questions });
});

const getBundle = asyncHandler(async (req, res) => {
  const { context } = req.body;
  if (!context) return res.status(400).json({ error: 'Context required' });
  const bundle = await generateBundle(context, {});
  res.json({ bundle });
});

const getPredictions = asyncHandler(async (req, res) => {
  const predictions = await predictNextPurchases(req.user?.id);
  res.json({ predictions });
});

const getPersona = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const searchHistory = await prisma.searchHistory.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  const persona = classifyPersona(user, searchHistory);

  if (user && persona.primary !== user.persona) {
    await prisma.user.update({ where: { id: req.user.id }, data: { persona: persona.primary } });
  }

  res.json({ persona });
});

const getMemory = asyncHandler(async (req, res) => {
  const memory = await getAIMemory(req.user?.id);
  res.json({ memory });
});

const updateMemory = asyncHandler(async (req, res) => {
  const memory = await require('../services/aiMemoryService').updateMemory(req.user.id, req.body);
  res.json({ memory });
});

const getWhyNotBuy = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ whyNotBuy: generateWhyNotBuy(product) });
});

const trackClick = asyncHandler(async (req, res) => {
  await trackRecommendationClick(req.user?.id);
  res.json({ tracked: true });
});

const trackAnalyticsEvent = asyncHandler(async (req, res) => {
  const { eventType, data } = req.body;
  await trackEvent(req.user?.id, eventType, data);
  res.json({ tracked: true });
});

module.exports = {
  getFullDecision, getSuitability, getPriceFairness, getBuyDecision, getMatchScore,
  getFollowUpQuestions, getBundle, getPredictions, getPersona, getMemory, updateMemory,
  getWhyNotBuy, trackClick, trackAnalyticsEvent,
};
