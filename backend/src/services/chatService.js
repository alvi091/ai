/*
 * Product AI Chat service — manages chat sessions and messages about products.
 * Each session is tied to a specific product URL and carries full product context
 * (specs, reviews, analysis, research) so the AI can answer follow-up questions.
 */

const prisma = require('../database');
const AIService = require('../ai/AIService');

let tablesReady = null;
async function checkTables() {
  if (tablesReady !== null) return tablesReady;
  try {
    await prisma.chatSession.findFirst({ take: 1 });
    tablesReady = true;
  } catch {
    tablesReady = false;
    console.warn('[chat] ChatSession table not found — run "npx prisma db push" to enable chat.');
  }
  return tablesReady;
}

function buildProductContext(analysis) {
  if (!analysis || !analysis.ok) return null;
  const p = analysis.product || {};
  const r = analysis.report || {};
  const intel = r.intelligence || {};
  const reviewAnalysis = intel.reviewAnalysis || {};
  const price = intel.price || {};
  const analytics = analysis.analytics || {};

  return {
    product: {
      name: p.title || p.name,
      brand: p.brand,
      price: p.price,
      originalPrice: p.originalPrice,
      currency: p.currency || 'INR',
      rating: p.rating,
      reviewCount: p.ratingCount || p.reviewCount || p.reviews_count,
      marketplace: analysis.site?.label || p.marketplace,
      category: p.category,
      image: p.image,
    },
    verdict: r.verdict || analytics.decision || null,
    reviewInsights: {
      totalReviews: reviewAnalysis.total || 0,
      avgRating: reviewAnalysis.avgRating,
      positive: reviewAnalysis.positive,
      negative: reviewAnalysis.negative,
      praises: reviewAnalysis.praises || [],
      complaints: reviewAnalysis.complaints || [],
      recurringIssues: reviewAnalysis.recurringIssues || [],
    },
    priceInsight: {
      current: price.current,
      original: price.original,
      fairnessLabel: price.fairnessLabel,
      bestTimeToBuy: price.bestTimeToBuy,
    },
    alternatives: (analysis.alternatives || []).map((a) => ({
      name: a.name,
      price: a.price,
      rating: a.rating,
    })),
  };
}

async function createSession({ productUrl, productName, analysis }) {
  if (!(await checkTables())) {
    return { sessionId: 'disabled', context: buildProductContext(analysis) };
  }
  const ctx = buildProductContext(analysis);
  const session = await prisma.chatSession.create({
    data: {
      productUrl,
      productName: ctx?.product?.name || productName || null,
      productBrand: ctx?.product?.brand || null,
      productImage: ctx?.product?.image || null,
      productPrice: ctx?.product?.price || null,
      productMarketplace: ctx?.product?.marketplace || null,
      analysisId: analysis?.resolvedUrl || null,
    },
  });
  return { sessionId: session.id, context: ctx };
}

async function addMessage({ sessionId, role, content }) {
  if (!(await checkTables())) return null;
  const msg = await prisma.chatMessage.create({
    data: { sessionId, role, content },
  });
  return msg;
}

async function getMessages(sessionId) {
  if (!(await checkTables())) return [];
  return prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  });
}

async function getSession(sessionId) {
  if (!(await checkTables())) return null;
  return prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
}

async function generateResponse({ sessionId, userMessage, analysis }) {
  const ctx = buildProductContext(analysis);

  if (sessionId === 'disabled' || !(await checkTables())) {
    return generateDirectResponse(userMessage, ctx);
  }

  const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error('Session not found');

  const history = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });

  const conversationHistory = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  return callAI(userMessage, ctx, conversationHistory);
}

function buildSystemPrompt(ctx) {
  return `You are Ayymus, an AI product research assistant. You help users make informed buying decisions.

PRODUCT CONTEXT:
${JSON.stringify(ctx, null, 2)}

RULES:
- Answer based ONLY on the provided product data and analysis
- Never fabricate information not present in the context
- If you don't know, say so honestly
- Be concise and direct
- Reference specific data points when possible (reviews, prices, ratings)
- If asked to compare with another product, note you only have data for the current product
- For marketplace questions, reference the marketplace comparison if available
- Keep responses under 200 words unless more detail is needed`;
}

async function callAI(userMessage, ctx, conversationHistory = []) {
  const messages = [
    { role: 'system', content: buildSystemPrompt(ctx) },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  let ai = null;
  try {
    ai = AIService.create('gemini');
  } catch {
    return 'I apologize, but my AI service is temporarily unavailable. Please try again in a moment.';
  }

  try {
    const fullPrompt = messages.map((m) => {
      if (m.role === 'system') return m.content;
      if (m.role === 'user') return `User: ${m.content}`;
      return `Assistant: ${m.content}`;
    }).join('\n\n');

    const result = await ai.provider._call(fullPrompt, null, 12000);
    return result || 'I could not generate a response. Please try again.';
  } catch (err) {
    console.error('[chat] AI error:', err.message);
    return 'I encountered an error processing your question. Please try again.';
  }
}

async function generateDirectResponse(userMessage, ctx) {
  return callAI(userMessage, ctx);
}

module.exports = { createSession, addMessage, getMessages, getSession, generateResponse, buildProductContext };
