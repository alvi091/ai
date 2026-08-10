const prisma = require('../database');

const ACCESSORY_MAP = {
  'Laptop': { mustHave: ['Laptop Bag', 'Mouse', 'Screen Cleaner'], budget: ['Mouse Pad', 'USB Hub'], premium: ['Mechanical Keyboard', 'Ultrawide Monitor', 'Laptop Stand'] },
  'Phone': { mustHave: ['Phone Case', 'Screen Protector'], budget: ['Pop Socket', 'Cable'], premium: ['Wireless Charger', 'AirPods', 'Phone Grip'] },
  'Headphones': { mustHave: ['Carrying Case'], budget: ['Cable'], premium: ['Headphone Stand', 'DAC/Amp'] },
  'Shoes': { mustHave: ['Shoe Cleaner Kit'], budget: ['Extra Laces', 'Insoles'], premium: ['Shoe Trees', 'Premium Insoles'] },
  'Camera': { mustHave: ['Memory Card', 'Camera Bag'], budget: ['Tripod', 'Cleaning Kit'], premium: ['Extra Lens', 'Flash'] },
  'Backpack': { mustHave: ['Laptop Sleeve'], budget: ['Keychain', 'Pencil Case'], premium: ['Organizer Inserts', 'Luggage Tag'] },
  'Watch': { mustHave: ['Watch Case'], budget: ['Watch Band', 'Screen Protector'], premium: ['Watch Winder', 'Premium Strap'] },
  'Tablet': { mustHave: ['Tablet Case', 'Screen Protector'], budget: ['Stand', 'Stylus Tip'], premium: ['Keyboard Case', 'Apple Pencil'] },
};

async function getAccessories(product) {
  const category = product.category || '';
  const name = product.name || '';
  let type = null;

  for (const [key] of Object.entries(ACCESSORY_MAP)) {
    if (name.toLowerCase().includes(key.toLowerCase()) || category.toLowerCase().includes(key.toLowerCase())) {
      type = key;
      break;
    }
  }

  if (!type) return null;

  const map = ACCESSORY_MAP[type];
  const results = {};

  for (const [tier, items] of Object.entries(map)) {
    const tierItems = [];
    for (const itemName of items) {
      const products = await prisma.product.findMany({
        where: { name: { contains: itemName, mode: 'insensitive' }, category: { not: category } },
        take: 2,
        orderBy: { rating: 'desc' },
      });
      if (products.length > 0) {
        tierItems.push({
          name: itemName,
          product: products[0],
          alternative: products[1] || null,
        });
      } else {
        tierItems.push({ name: itemName, product: null, alternative: null });
      }
    }
    results[tier] = tierItems;
  }

  const frequentlyBought = await prisma.product.findMany({
    where: { category: { not: category } },
    take: 6,
    orderBy: [{ rating: 'desc' }, { reviews: 'desc' }],
  });

  return {
    type,
    frequentlyPurchasedTogether: frequentlyBought.slice(0, 4),
    mustHave: results.mustHave || [],
    budget: results.budget || [],
    premium: results.premium || [],
  };
}

module.exports = { getAccessories, ACCESSORY_MAP };
