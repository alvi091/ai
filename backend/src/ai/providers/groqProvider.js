const AIProviderInterface = require('./aiProviderInterface');

class GroqProvider extends AIProviderInterface {
  constructor() { super(); this.ready = false; }
  async extractIntent() { throw new Error('Groq not yet implemented'); }
  async generateRecommendation() { throw new Error('Groq not yet implemented'); }
  async compareProducts() { throw new Error('Groq not yet implemented'); }
  async summarizeReviews() { throw new Error('Groq not yet implemented'); }
  async generateDecision() { throw new Error('Groq not yet implemented'); }
  async generateExplanation() { throw new Error('Groq not yet implemented'); }
  async analyzeWorth() { throw new Error('Groq not yet implemented'); }
  async generateBundleSuggestions() { throw new Error('Groq not yet implemented'); }
  async generateFollowUpQuestions() { throw new Error('Groq not yet implemented'); }
  async generateWhyNotBuy() { throw new Error('Groq not yet implemented'); }
}

module.exports = GroqProvider;
