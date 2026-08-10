const AIProviderInterface = require('./aiProviderInterface');

class ClaudeProvider extends AIProviderInterface {
  constructor() { super(); this.ready = false; }
  async extractIntent() { throw new Error('Claude not yet implemented'); }
  async generateRecommendation() { throw new Error('Claude not yet implemented'); }
  async compareProducts() { throw new Error('Claude not yet implemented'); }
  async summarizeReviews() { throw new Error('Claude not yet implemented'); }
  async generateDecision() { throw new Error('Claude not yet implemented'); }
  async generateExplanation() { throw new Error('Claude not yet implemented'); }
  async analyzeWorth() { throw new Error('Claude not yet implemented'); }
  async generateBundleSuggestions() { throw new Error('Claude not yet implemented'); }
  async generateFollowUpQuestions() { throw new Error('Claude not yet implemented'); }
  async generateWhyNotBuy() { throw new Error('Claude not yet implemented'); }
}

module.exports = ClaudeProvider;
