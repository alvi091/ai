/*
 * Product AI Chat service — manages chat sessions and messages about products.
 * Each session is tied to a specific product URL and carries full product context
 * (specs, reviews, analysis, research) so the AI can answer follow-up questions.
 */

const prisma = require('../database');
const AIService = require('../ai/AIService');
const { TOOL_DEFINITIONS, executeTool } = require('./agentTools');

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
    const text = await generateDirectResponse(userMessage, ctx);
    return { text, trace: [] };
  }

  const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
  if (!session) throw new Error('Session not found');

  const history = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });

  const { text, trace } = await runAgentLoop({
    ctx,
    systemInstruction: buildAgentPrompt(ctx),
    modelHistory: toModelHistory(history),
    historyRows: history,
    userMessage,
  });
  return { text, trace };
}

// --------------------------------------------------------------------------- #
// Tool-using agent loop (Gemini native function calling)
// --------------------------------------------------------------------------- #

const MAX_TOOL_ROUNDS = 3;
const AGENT_BUDGET_MS = 95000;

function buildAgentPrompt(ctx) {
  return `You are Ayymus, an AI shopping agent with live tools for scraping and product research.

PRODUCT CONTEXT (may be empty for open questions):
${JSON.stringify(ctx || {}, null, 2)}

TOOLS
- web_search(query, num): search the web (semantic + Google).
- read_url(url): read a page and get its text.
- research_product(productName, brand, category, price): expert findings, common problems, alternatives.
- scrape_product(url): full analysis of a product listing (price, ratings, reviews, verdict).
- youtube_transcript(url): transcript of a video review.

RULES
- For anything outside the product context — recent news, other products, opinions, comparisons — call a tool instead of guessing.
- Use at most 2-3 tool calls per reply; then answer.
- Answer in under 200 words unless the user asks for detail.
- Cite sources as (domain) when you used web results; never invent prices, ratings or reviews.
- If a tool fails, say what you could not check and answer from what you have.`;
}

function toModelHistory(rows) {
  const out = [];
  for (const row of rows || []) {
    if (!row || !row.content) continue;
    const role = row.role === 'assistant' ? 'model' : 'user';
    const text = String(row.content).slice(0, 4000);
    const last = out[out.length - 1];
    if (last && last.role === role) {
      last.parts[0].text += `\n${text}`;
    } else {
      out.push({ role, parts: [{ text }] });
    }
  }
  return out;
}

function compactArgs(args) {
  const out = {};
  for (const [key, value] of Object.entries(args || {})) {
    if (typeof value === 'string') out[key] = value.length > 140 ? `${value.slice(0, 140)}…` : value;
    else if (typeof value === 'number' || typeof value === 'boolean') out[key] = value;
    else out[key] = String(value).slice(0, 140);
  }
  return out;
}

async function runAgentLoop({ ctx, systemInstruction, modelHistory, historyRows, userMessage }) {
  const trace = [];
  const deadline = Date.now() + AGENT_BUDGET_MS;

  const fallback = async () => ({
    text: await callAI(userMessage, ctx, historyRows || []),
    trace,
  });

  let ai = null;
  try {
    ai = AIService.create('gemini');
    if (typeof ai.provider.createChat !== 'function') throw new Error('provider has no function calling');
  } catch (err) {
    return fallback();
  }

  try {
    const chat = ai.provider.createChat({
      systemInstruction,
      history: modelHistory,
      tools: TOOL_DEFINITIONS,
    });
    let response = await chat.sendMessage(userMessage);

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const calls =
        (typeof response.functionCalls === 'function' && response.functionCalls()) || [];
      if (!calls.length) break;

      if (round >= MAX_TOOL_ROUNDS || Date.now() > deadline) {
        response = await chat.sendMessage(
          'Stop calling tools. Answer now with what you already have, and mention anything you could not check.'
        );
        break;
      }

      const parts = [];
      for (const call of calls) {
        const startedAt = Date.now();
        const args = call.args || {};
        const result = await executeTool(call.name, args);
        const failed = !result || result.ok === false;
        trace.push({
          tool: call.name,
          args: compactArgs(args),
          ok: !failed,
          ms: Date.now() - startedAt,
          ...(failed ? { detail: String(result && result.error || 'failed').slice(0, 200) } : {}),
        });
        parts.push({ functionResponse: { name: call.name, response: result || {} } });
      }
      if (!parts.length) break;
      response = await chat.sendMessage(parts);
    }

    let text = '';
    try {
      text = response.text();
    } catch {
      text = '';
    }
    if (!text) text = 'I could not generate a response. Please try again.';
    return { text, trace };
  } catch (err) {
    console.error('[chat] agent loop failed, falling back to single-shot:', err.message);
    return fallback();
  }
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
