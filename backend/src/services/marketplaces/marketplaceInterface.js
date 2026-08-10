class MarketplaceInterface {
  async searchProducts(query) { throw new Error('Not implemented'); }
  async getProduct(id) { throw new Error('Not implemented'); }
  async getPriceHistory(id) { throw new Error('Not implemented'); }
  async getReviews(id) { throw new Error('Not implemented'); }
  async getCategories() { throw new Error('Not implemented'); }
}

class AmazonMarketplace extends MarketplaceInterface {}
class FlipkartMarketplace extends MarketplaceInterface {}
class WalmartMarketplace extends MarketplaceInterface {}
class BestBuyMarketplace extends MarketplaceInterface {}
class EbayMarketplace extends MarketplaceInterface {}
class ShopifyMarketplace extends MarketplaceInterface {}

module.exports = { MarketplaceInterface, AmazonMarketplace, FlipkartMarketplace, WalmartMarketplace, BestBuyMarketplace, EbayMarketplace, ShopifyMarketplace };
