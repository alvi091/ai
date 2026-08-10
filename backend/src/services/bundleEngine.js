const AIService = require('../ai/AIService');
const prisma = require('../database');

const PREDEFINED_BUNDLES = {
  'college': {
    title: 'Starting College',
    items: [
      { name: 'Laptop', category: 'Electronics', role: 'primary' },
      { name: 'Mouse', category: 'Electronics', role: 'accessory' },
      { name: 'Backpack', category: 'Fashion', role: 'accessory' },
      { name: 'Headphones', category: 'Electronics', role: 'accessory' },
      { name: 'Water Bottle', category: 'Home & Kitchen', role: 'essential' },
      { name: 'Notebook Set', category: 'Books & Stationery', role: 'essential' },
    ],
  },
  'gaming': {
    title: 'Gaming Setup',
    items: [
      { name: 'Gaming Laptop', category: 'Electronics', role: 'primary' },
      { name: 'Gaming Mouse', category: 'Electronics', role: 'accessory' },
      { name: 'Gaming Keyboard', category: 'Electronics', role: 'accessory' },
      { name: 'Gaming Headset', category: 'Electronics', role: 'accessory' },
      { name: 'Gaming Chair', category: 'Home & Kitchen', role: 'furniture' },
    ],
  },
  'fitness': {
    title: 'Fitness Starter',
    items: [
      { name: 'Running Shoes', category: 'Fashion', role: 'primary' },
      { name: 'Water Bottle', category: 'Home & Kitchen', role: 'essential' },
      { name: 'Gym Bag', category: 'Fashion', role: 'accessory' },
      { name: 'Yoga Mat', category: 'Sports & Outdoors', role: 'essential' },
    ],
  },
};

async function generateBundle(context, intent) {
  const contextLower = context.toLowerCase();
  const aiService = AIService.create('gemini');

  let matchedBundle = null;
  for (const [key, bundle] of Object.entries(PREDEFINED_BUNDLES)) {
    if (contextLower.includes(key)) {
      matchedBundle = { ...bundle, key };
      break;
    }
  }

  if (!matchedBundle) {
    try {
      const aiResponse = await aiService.generateBundleSuggestions(context);
      if (aiResponse.bundles && aiResponse.bundles.length > 0) {
        const bundle = aiResponse.bundles[0];
        return {
          title: bundle.title,
          items: bundle.items.map(item => ({
            name: item.name,
            category: item.category,
            estimatedPrice: item.estimated_price,
          })),
          totalBudget: bundle.total_budget || 0,
          totalPremium: bundle.total_premium || 0,
          totalBestValue: bundle.total_best_value || 0,
        };
      }
    } catch {}
    return null;
  }

  const items = [];
  for (const req of matchedBundle.items) {
    const products = await prisma.product.findMany({
      where: { category: { contains: req.category } },
      take: 5,
      orderBy: { rating: 'desc' },
    });
    if (products.length > 0) {
      const sorted = products.sort((a, b) => b.price - a.price);
      items.push({
        name: req.name,
        category: req.category,
        role: req.role,
        budget: [...products].sort((a, b) => a.price - b.price)[0] || sorted[sorted.length - 1],
        premium: sorted[0],
        bestValue: products.sort((a, b) => (b.rating / b.price) - (a.rating / a.price))[0],
      });
    }
  }

  const totalBudget = items.reduce((s, i) => s + (i.budget?.price || 0), 0);
  const totalPremium = items.reduce((s, i) => s + (i.premium?.price || 0), 0);
  const totalBestValue = items.reduce((s, i) => s + (i.bestValue?.price || 0), 0);

  return {
    title: matchedBundle.title,
    items: items.map(i => ({
      name: i.name,
      category: i.category,
      role: i.role,
      budgetProduct: i.budget ? { id: i.budget.id, name: i.budget.name, price: i.budget.price, image: i.budget.image, rating: i.budget.rating } : null,
      premiumProduct: i.premium ? { id: i.premium.id, name: i.premium.name, price: i.premium.price, image: i.premium.image, rating: i.premium.rating } : null,
      bestValueProduct: i.bestValue ? { id: i.bestValue.id, name: i.bestValue.name, price: i.bestValue.price, image: i.bestValue.image, rating: i.bestValue.rating } : null,
    })),
    totalBudget: Math.round(totalBudget),
    totalPremium: Math.round(totalPremium),
    totalBestValue: Math.round(totalBestValue),
  };
}

module.exports = { generateBundle, PREDEFINED_BUNDLES };
