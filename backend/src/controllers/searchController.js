const prisma = require('../database');
const AIService = require('../ai/AIService');
const { recommendProducts } = require('../recommendation/engine');
const { sanitizePrompt } = require('../utils/helpers');
const { asyncHandler } = require('../utils/asyncHandler');
const { extractIntentFromPrompt } = require('../utils/intentFallback');

const aiService = AIService.create('gemini');

const search = asyncHandler(async (req, res) => {
  const { prompt } = req.validatedBody;
  const cleanPrompt = sanitizePrompt(prompt);

  let intent;
  try {
    intent = await aiService.extractIntent(cleanPrompt);
  } catch {
    intent = extractIntentFromPrompt(cleanPrompt);
  }
  intent.original_prompt = cleanPrompt;

  const recommended = await recommendProducts(intent, req.user?.id);
  const results = recommended;

  try {
    const explanations = await Promise.all(results.map((product) => aiService.generateExplanation(product, intent)));
    results.forEach((product, index) => { product.aiExplanation = explanations[index]; });
  } catch {
    results.forEach((product) => {
      product.aiExplanation = {
        whyRecommended: `This ${product.name} scores ${product.suitabilityScore}% suitability based on your requirements.`,
        pros: JSON.parse(product.pros || '[]').slice(0, 2),
        cons: JSON.parse(product.cons || '[]').slice(0, 1),
        summary: product.description,
      };
    });
  }

  if (req.user) {
    try {
      await prisma.searchHistory.create({
        data: { userId: req.user.id, prompt: cleanPrompt, intent: JSON.stringify(intent), results: JSON.stringify(results.map((r) => ({ id: r.id, name: r.name, score: r.suitabilityScore }))) },
      });
    } catch {}
  }

  res.json({ intent, results, totalResults: recommended.length });
});

const getSearchHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const [history, total] = await Promise.all([
    prisma.searchHistory.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: parseInt(limit) }),
    prisma.searchHistory.count({ where: { userId: req.user.id } }),
  ]);
  res.json({ history, pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) } });
});

const deleteSearchHistory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.searchHistory.deleteMany({ where: { id, userId: req.user.id } });
  res.json({ message: 'Search history deleted' });
});

module.exports = { search, getSearchHistory, deleteSearchHistory };
