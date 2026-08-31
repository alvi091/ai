const AIProviderInterface = require('./aiProviderInterface');
const config = require('../../config');

class GeminiProvider extends AIProviderInterface {
  constructor() {
    super();
    this.model = null;
    this.ready = false;
    try {
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      if (!config.gemini.apiKey) throw new Error('Gemini API key not configured');
      const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
      this.model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
      this.ready = true;
    } catch (e) {
      console.warn('Gemini init failed:', e.message);
    }
  }

  async _call(prompt, schema = null, timeoutMs = 8000) {
    if (!this.ready || !this.model) throw new Error('Gemini not available');
    const t0 = Date.now();
    let fullPrompt = prompt;
    if (schema) {
      fullPrompt = `${prompt}\n\nRespond with valid JSON only. Use this schema:\n${JSON.stringify(schema, null, 2)}`;
    }
    const attempt = async () => {
      const result = await Promise.race([
        this.model.generateContent(fullPrompt),
        new Promise((_, reject) => setTimeout(() => reject(new Error('AI timed out')), timeoutMs)),
      ]);
      return result.response.text().trim();
    };
    let text;
    let lastErr;
    const delays = [500, 1500];
    for (let i = 0; i <= delays.length; i++) {
      try {
        text = await attempt();
        break;
      } catch (err) {
        lastErr = err;
        if (i < delays.length) await new Promise((r) => setTimeout(r, delays[i]));
      }
    }
    if (text == null) throw lastErr || new Error('AI timed out');
    try {
      const { trackAIUsage } = require('../../services/analyticsTracker');
      trackAIUsage({ requestType: 'general', model: 'gemini-3.6-flash', durationMs: Date.now() - t0, success: true });
    } catch (_) {}
    if (schema) text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    return text;
  }

  _parseJSON(raw) {
    try { return JSON.parse(raw); } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : null;
    }
  }

  async extractIntent(prompt) {
    const schema = { category: 'string | null', budget: 'number | null', usage: 'string | null', weather: 'string | null', priority: 'string | null', features: 'string[]', brand_preference: 'string | null', min_budget: 'number | null', max_budget: 'number | null' };
    const raw = await this._call(`Extract shopping intent from: "${prompt}"`, schema);
    const intent = this._parseJSON(raw) || {};
    return {
      category: intent.category || null, budget: intent.budget || intent.max_budget || null,
      min_budget: intent.min_budget || null, max_budget: intent.max_budget || intent.budget || null,
      usage: intent.usage || null, weather: intent.weather || null, priority: intent.priority || null,
      features: Array.isArray(intent.features) ? intent.features : [], brand_preference: intent.brand_preference || null,
    };
  }

  async generateExplanation(product, intent) {
    const schema = { why_recommended: 'string', pros: 'string[]', cons: 'string[]', summary: 'string' };
    const prompt = `User searched for: "${intent.original_prompt || 'a product'}". Explain why this fits:\nName: ${product.name}\nBrand: ${product.brand}\nPrice: $${product.price}\nDescription: ${product.description}\nRating: ${product.rating}/5`;
    const raw = await this._call(prompt, schema);
    const exp = this._parseJSON(raw) || {};
    return { whyRecommended: exp.why_recommended || product.description, pros: exp.pros || [], cons: exp.cons || [], summary: exp.summary || product.description };
  }

  async compareProducts(products) {
    const schema = { comparison_summary: 'string', recommendations: [{ product_id: 'string', best_for: 'string', reason: 'string' }], final_recommendation: 'string' };
    const list = products.map(p => `ID: ${p.id} | ${p.name} | $${p.price} | Rating: ${p.rating}`).join('\n');
    const raw = await this._call(`Compare these products:\n${list}\nRecommend which is best for different use cases.`, schema);
    return this._parseJSON(raw) || { comparison_summary: '', recommendations: [], final_recommendation: '' };
  }

  async summarizeReviews(productName, reviews) {
    const schema = { summary: 'string', common_pros: 'string[]', common_cons: 'string[]', overall_sentiment: 'string' };
    const raw = await this._call(`Summarize reviews for "${productName}":\n${reviews.slice(0, 20).join('\n')}`, schema);
    return this._parseJSON(raw) || { summary: '', common_pros: [], common_cons: [], overall_sentiment: 'mixed' };
  }

  async generateDecision(product, intent) {
    const schema = { decision: 'string ("buy_now"|"wait"|"buy_later"|"not_recommended")', explanation: 'string', confidence: 'number (0-100)', why_now: 'string' };
    const prompt = `Should the user buy ${product.name} ($${product.price})? User wants: ${intent.original_prompt || 'a product'}. Rating: ${product.rating}/5. Decide: buy_now, wait, buy_later, or not_recommended. Explain why.`;
    const raw = await this._call(prompt, schema);
    return this._parseJSON(raw) || { decision: 'wait', explanation: '', confidence: 50, why_now: '' };
  }

  async generateWhyNotBuy(product, context) {
    const schema = { reasons: 'string[]', summary: 'string' };
    const prompt = `List reasons NOT to buy ${product.name} ($${product.price}). Consider: weight, battery, waterproof, warranty, size, alternatives. Be honest.`;
    const raw = await this._call(prompt, schema);
    return this._parseJSON(raw) || { reasons: [], summary: '' };
  }

  async generateBundleSuggestions(context) {
    const schema = { bundles: [{ title: 'string', items: [{ name: 'string', category: 'string', estimated_price: 'number' }], total_budget: 'number', total_premium: 'number', total_best_value: 'number' }] };
    const raw = await this._call(`User context: ${context}. Suggest product bundles with budget, premium, and best value options.`, schema);
    return this._parseJSON(raw) || { bundles: [] };
  }

  async generateFollowUpQuestions(intent) {
    const schema = { questions: 'string[] (max 3)' };
    const raw = await this._call(`User intent: ${JSON.stringify(intent)}. Ask max 3 clarifying questions to help recommend better. Be specific, not generic.`, schema);
    const result = this._parseJSON(raw) || { questions: [] };
    return (result.questions || []).slice(0, 3);
  }

  async generateProductReport(analytics, context = {}) {
    const schema = {
      verdict: { key: 'string (one of: BUY_NOW, WAIT, BUY_DURING_SALE, GOOD_BUT_OVERPRICED, BEST_IN_CATEGORY, GOOD_FOR_SPECIFIC_USERS, NOT_RECOMMENDED, EXCELLENT_LONG_TERM_VALUE, BETTER_ALTERNATIVES, GREAT_ENTRY_LEVEL, PREMIUM_CHOICE)', label: 'string', confidence: 'number 0-100', rationale: 'string', factors: [{ label: 'string', direction: 'string', impact: 'string', detail: 'string' }] },
      summary: { headline: 'string', paragraphs: 'string[]', confidence: 'number 0-100' },
      sections: [{ id: 'string', title: 'string', headline: 'string', paragraphs: 'string[]', evidence: 'string[]', confidence: 'number 0-100' }],
      personalization: { text: 'string', confidence: 'number 0-100', present: 'boolean' },
      dataQuality: { level: 'string', notes: 'string[]' },
    };

    // Trim payload — only include fields Gemini needs, skip verbose/redundant data
    const compact = {
      product: analytics.product,
      price: analytics.price,
      trend: { direction: analytics.trend?.direction, changePercent: analytics.trend?.changePercent, nearLow: analytics.trend?.nearLow, nearHigh: analytics.trend?.nearHigh },
      reviews: { totalReviews: analytics.reviews?.totalReviews, averageRating: analytics.reviews?.averageRating, positivePercent: analytics.reviews?.positivePercent, negativePercent: analytics.reviews?.negativePercent, mostLoved: (analytics.reviews?.mostLoved || []).slice(0, 3), mostComplained: (analytics.reviews?.mostComplained || []).slice(0, 3) },
      sentiment: analytics.sentiment,
      popularity: analytics.popularity,
      risk: analytics.risk,
      worth: analytics.worth,
      category: { name: analytics.category?.name, focusAreas: analytics.category?.focusAreas, timing: analytics.category?.timing },
      suitability: analytics.suitability ? { overallFit: analytics.suitability.overallFit, whyFits: (analytics.suitability.whyFits || []).slice(0, 3), whyNot: (analytics.suitability.whyNot || []).slice(0, 3) } : null,
      betterAlternative: analytics.betterAlternative,
    };

    const prompt = `You are a product consultant writing a buying analysis. Use ONLY the provided data — never invent facts.

Write a verdict, a short summary (2-3 paragraphs), 2-4 analysis sections with evidence, and a personalization note if user context exists. Pick one verdict key from: BUY_NOW, WAIT, BUY_DURING_SALE, GOOD_BUT_OVERPRICED, BEST_IN_CATEGORY, NOT_RECOMMENDED, EXCELLENT_LONG_TERM_VALUE, BETTER_ALTERNATIVES.

User context: ${JSON.stringify({ prompt: context.prompt, budget: context.user?.budgetMax, brands: context.user?.preferredBrands })}

Analytics: ${JSON.stringify(compact)}`;

    const raw = await this._call(prompt, schema, 10000);
    const report = this._parseJSON(raw);
    if (!report || !report.verdict) return null;
    if (!Array.isArray(report.sections)) report.sections = [];
    return report;
  }
}

module.exports = GeminiProvider;
