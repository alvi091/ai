const prisma = require('../database');

const PURCHASE_CHAINS = {
  'Laptop': [{ name: 'Mouse', category: 'Electronics', order: 1 }, { name: 'Monitor', category: 'Electronics', order: 2 }, { name: 'Keyboard', category: 'Electronics', order: 3 }, { name: 'Docking Station', category: 'Electronics', order: 4 }],
  'Phone': [{ name: 'Case', category: 'Fashion', order: 1 }, { name: 'Screen Protector', category: 'Electronics', order: 2 }, { name: 'Wireless Charger', category: 'Electronics', order: 3 }, { name: 'Power Bank', category: 'Electronics', order: 4 }],
  'Camera': [{ name: 'Memory Card', category: 'Electronics', order: 1 }, { name: 'Camera Bag', category: 'Fashion', order: 2 }, { name: 'Tripod', category: 'Electronics', order: 3 }, { name: 'Extra Lens', category: 'Electronics', order: 4 }],
  'Headphones': [{ name: 'Headphone Stand', category: 'Electronics', order: 1 }, { name: 'Carrying Case', category: 'Fashion', order: 2 }, { name: 'Cable', category: 'Electronics', order: 3 }],
  'Shoes': [{ name: 'Shoe Cleaner', category: 'Home & Kitchen', order: 1 }, { name: 'Insoles', category: 'Fashion', order: 2 }, { name: 'Shoe Bags', category: 'Fashion', order: 3 }],
};

async function predictNextPurchases(userId) {
  if (!userId) return [];
  const wishlistItems = await prisma.wishlist.findMany({
    where: { userId },
    include: { product: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  const searchHistory = await prisma.searchHistory.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  const purchasedCategories = new Set();
  wishlistItems.forEach(item => {
    if (item.product?.category) purchasedCategories.add(item.product.category);
  });

  const predictions = [];
  for (const [productType, chain] of Object.entries(PURCHASE_CHAINS)) {
    const typeLower = productType.toLowerCase();
    const hasProduct = wishlistItems.some(item =>
      item.product?.name?.toLowerCase().includes(typeLower) ||
      searchHistory.some(s => s.prompt?.toLowerCase().includes(typeLower))
    );
    if (hasProduct) {
      for (const item of chain) {
        const alreadyOwned = wishlistItems.some(wi =>
          wi.product?.name?.toLowerCase().includes(item.name.toLowerCase())
        );
        if (!alreadyOwned) {
          const products = await prisma.product.findMany({
            where: { category: { contains: item.category }, name: { contains: item.name, mode: 'insensitive' } },
            take: 3,
            orderBy: { rating: 'desc' },
          });
          predictions.push({
            basedOn: productType,
            item: item.name,
            category: item.category,
            order: item.order,
            products: products.slice(0, 1).map(p => ({ id: p.id, name: p.name, price: p.price, image: p.image, rating: p.rating })),
          });
        }
      }
    }
  }

  return predictions.sort((a, b) => a.order - b.order).slice(0, 8);
}

module.exports = { predictNextPurchases, PURCHASE_CHAINS };
