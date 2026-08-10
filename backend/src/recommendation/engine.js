const prisma = require('../database');

const KEYWORD_SYNONYMS = {
  'shoe': ['boot', 'sneaker', 'footwear', 'sandal', 'loafer'],
  'shoes': ['boots', 'sneakers', 'footwear', 'sandals', 'loafers'],
  'jacket': ['coat', 'hoodie', 'blazer'],
  'jackets': ['coats', 'hoodies'],
  'pant': ['jeans', 'trouser', 'shorts'],
  'pants': ['jeans', 'trousers', 'shorts'],
  'bag': ['backpack', 'purse', 'tote'],
  'bags': ['backpacks'],
  'pet': ['dog', 'cat', 'bird'],
  'pets': ['dogs', 'cats', 'birds'],
  'gaming': ['game', 'video game'],
  'run': ['running', 'jog', 'jogging'],
  'walk': ['walking'],
};

const STOP_WORDS = new Set(['i', 'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'it', 'they', 'them',
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can',
  'for', 'of', 'in', 'on', 'at', 'to', 'with', 'by', 'from', 'up', 'about', 'into', 'through',
  'and', 'or', 'but', 'not', 'so', 'if', 'than', 'as', 'that', 'this', 'these', 'those',
  'need', 'want', 'looking', 'find', 'best', 'good', 'great', 'nice', 'under', 'over', 'between',
  'budget', 'around', 'some', 'very', 'just', 'also', 'well', 'get', 'use', 'used', 'buy', 'price',
  'max', 'min', 'new', 'please', 'help', 'recommend', 'suggest', 'search']);

function extractKeywords(prompt) {
  if (!prompt) return [];
  return prompt.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function expandKeyword(kw) {
  const expanded = KEYWORD_SYNONYMS[kw] || [];
  return [kw, ...expanded];
}

function calculateKeywordScore(product, keywords) {
  if (!keywords || keywords.length === 0) return 0.5;
  const words = [
    ...product.name.toLowerCase().split(/\s+/),
    ...(product.description || '').toLowerCase().split(/\s+/),
    ...(product.features || '').toLowerCase().split(/[,\s"]+/).filter(Boolean),
    product.category.toLowerCase(),
    product.brand.toLowerCase(),
  ];
  const uniqueWords = [...new Set(words)].filter(w => w.length > 2);
  const matches = keywords.filter(kw => {
    const kwVariants = expandKeyword(kw);
    return kwVariants.some(variant =>
      uniqueWords.some(w => w.includes(variant) || variant.includes(w))
    );
  }).length;
  if (matches === 0) return 0.1;
  return 0.5 + (matches / keywords.length) * 0.5;
}

const WEIGHTS = {
  comfort: 0.25,
  budget: 0.15,
  durability: 0.10,
  reviews: 0.10,
  weatherMatch: 0.05,
  userPreference: 0.10,
  keywordMatch: 0.25,
};

function calculateBudgetScore(price, maxBudget, minBudget) {
  const max = maxBudget || Infinity;
  const min = minBudget || 0;

  if (price > max) return 0;
  if (price < min) return 0.3;
  if (price <= max * 0.3) return 0.8;
  if (price <= max * 0.6) return 1.0;
  if (price <= max * 0.85) return 0.9;
  return 0.7;
}

function calculateWeatherScore(product, weather) {
  if (!weather || weather === null) return 0.5;

  const w = weather.toLowerCase();
  let score = 0.5;

  if (w.includes('winter') || w.includes('cold') || w.includes('snow')) {
    if (product.winterScore && product.winterScore > 0) score += (product.winterScore / 100) * 0.5;
    if (product.waterproof) score += 0.2;
  }
  if (w.includes('rain') || w.includes('wet')) {
    if (product.waterproof) score += 0.4;
  }
  if (w.includes('summer') || w.includes('hot')) {
    if (product.weight && product.weight < 300) score += 0.2;
  }

  return Math.min(score, 1);
}

function calculateFeatureScore(product, features) {
  if (!features || features.length === 0) return 0.5;

  let matches = 0;
  const productText = [
    product.name,
    product.description,
    product.features || '',
    product.category,
  ].join(' ').toLowerCase();

  for (const feature of features) {
    if (productText.includes(feature.toLowerCase())) {
      matches++;
    }
    if (feature.toLowerCase() === 'waterproof' && product.waterproof) {
      matches++;
    }
    if (feature.toLowerCase() === 'wide feet' && product.wideFeet) {
      matches++;
    }
  }

  return Math.min(0.5 + (matches / features.length) * 0.5, 1);
}

function calculateUsageScore(product, usage, category) {
  if (!usage) return 0.5;

  const u = usage.toLowerCase();

  if (u.includes('walk') && product.walkingScore) return product.walkingScore / 100;
  if (u.includes('runn') && product.runningScore) return product.runningScore / 100;
  if (u.includes('gaming') && (category === 'Electronics' || category === 'Laptops')) {
    return (product.rating / 5) * 0.8 + 0.2;
  }
  if (u.includes('program') && (category === 'Electronics' || category === 'Laptops')) {
    return 0.9;
  }
  if (u.includes('office') && (category === 'Home & Kitchen' || category === 'Office Chairs')) {
    return product.comfortScore / 100 * 0.8 + 0.2;
  }

  return 0.5;
}

function calculateSuitability(product, intent, keywords) {
  const budgetScore = calculateBudgetScore(product.price, intent.max_budget || intent.budget, intent.min_budget);
  const weatherScore = calculateWeatherScore(product, intent.weather);
  const featureScore = calculateFeatureScore(product, intent.features);
  const usageScore = calculateUsageScore(product, intent.usage, intent.category);
  const keywordScore = calculateKeywordScore(product, keywords);

  const comfortScore = (product.comfortScore || 50) / 100;
  const durabilityScore = (product.durabilityScore || 50) / 100;
  const reviewScore = Math.min(product.rating / 5, 1);

  const score =
    comfortScore * WEIGHTS.comfort +
    budgetScore * WEIGHTS.budget +
    durabilityScore * WEIGHTS.durability +
    reviewScore * WEIGHTS.reviews +
    weatherScore * WEIGHTS.weatherMatch +
    ((featureScore + usageScore) / 2) * WEIGHTS.userPreference +
    keywordScore * WEIGHTS.keywordMatch;

  return Math.round(score * 100);
}

async function recommendProducts(intent, userId = null) {
  const { category, max_budget, min_budget, weather, usage, features, brand_preference, priority, original_prompt } = intent;
  const keywords = extractKeywords(original_prompt);

  let whereClause = {};

  if (category) {
    whereClause.category = { contains: category, mode: 'insensitive' };
  }

  if (brand_preference) {
    whereClause.brand = { contains: brand_preference, mode: 'insensitive' };
  }

  let products = await prisma.product.findMany({
    where: whereClause,
    take: 200,
  });

  if (products.length === 0 && category) {
    const allCategories = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: category, mode: 'insensitive' } },
          { description: { contains: category, mode: 'insensitive' } },
        ],
      },
      take: 200,
    });

    if (allCategories.length > 0) {
      products = allCategories;
    } else {
      products = await prisma.product.findMany({ take: 200 });
    }
  }

  if (products.length === 0) {
    products = await prisma.product.findMany({ take: 200 });
  }

  const scored = products.map((product) => ({
    ...product,
    suitabilityScore: calculateSuitability(product, intent, keywords),
  }));

  scored.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

  const top30 = scored.slice(0, 30);

  return top30;
}

module.exports = {
  recommendProducts,
  calculateSuitability,
};
