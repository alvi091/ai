const GeminiProvider = require('./providers/geminiProvider');
const OpenAIProvider = require('./providers/openaiProvider');
const ClaudeProvider = require('./providers/claudeProvider');
const GroqProvider = require('./providers/groqProvider');

const PROVIDERS = {
  gemini: GeminiProvider,
  openai: OpenAIProvider,
  claude: ClaudeProvider,
  groq: GroqProvider,
};

class AIService {
  constructor(provider = 'gemini') {
    const ProviderClass = PROVIDERS[provider];
    if (!ProviderClass) throw new Error(`Unknown AI provider: ${provider}`);
    this.provider = new ProviderClass();
    this.providerName = provider;
  }

  async extractIntent(prompt) { return this.provider.extractIntent(prompt); }
  async generateRecommendation(product, intent) { return this.provider.generateRecommendation(product, intent); }
  async compareProducts(products) { return this.provider.compareProducts(products); }
  async summarizeReviews(productName, reviews) { return this.provider.summarizeReviews(productName, reviews); }
  async generateDecision(product, intent) { return this.provider.generateDecision(product, intent); }
  async generateExplanation(product, intent) { return this.provider.generateExplanation(product, intent); }
  async analyzeWorth(productData) { return this.provider.analyzeWorth(productData); }
  async generateBundleSuggestions(context) { return this.provider.generateBundleSuggestions(context); }
  async generateFollowUpQuestions(intent) { return this.provider.generateFollowUpQuestions(intent); }
  async generateWhyNotBuy(product, context) { return this.provider.generateWhyNotBuy(product, context); }
  async generateProductReport(analytics, context) { return this.provider.generateProductReport(analytics, context); }

  static create(provider = 'gemini') {
    return new AIService(provider);
  }
}

module.exports = AIService;
