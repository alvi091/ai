class AIProviderInterface {
  async extractIntent(prompt) { throw new Error('Not implemented'); }
  async generateRecommendation(product, intent) { throw new Error('Not implemented'); }
  async compareProducts(products) { throw new Error('Not implemented'); }
  async summarizeReviews(productName, reviews) { throw new Error('Not implemented'); }
  async generateDecision(product, intent) { throw new Error('Not implemented'); }
  async generateExplanation(product, intent) { throw new Error('Not implemented'); }
  async analyzeWorth(productData) { throw new Error('Not implemented'); }
  async generateBundleSuggestions(context) { throw new Error('Not implemented'); }
  async generateFollowUpQuestions(intent) { throw new Error('Not implemented'); }
  async generateWhyNotBuy(product, context) { throw new Error('Not implemented'); }
  async generateProductReport(analytics, context) { throw new Error('Not implemented'); }
}

module.exports = AIProviderInterface;
