const prisma = require('../database');

async function getMemory(userId) {
  if (!userId) return null;
  let memory = await prisma.aIMemory.findUnique({ where: { userId } });
  if (!memory) {
    memory = await prisma.aIMemory.create({ data: { userId } });
  }
  return memory;
}

async function updateMemory(userId, data) {
  if (!userId) return null;
  return prisma.aIMemory.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}

async function learnFromSearch(userId, searchData) {
  if (!userId) return;
  const memory = await getMemory(userId);
  const updates = {};
  if (searchData.intent?.category) {
    const existing = (memory.favoriteCategories || '').split(',').filter(Boolean);
    if (!existing.includes(searchData.intent.category)) {
      existing.push(searchData.intent.category);
      updates.favoriteCategories = existing.slice(-5).join(',');
    }
  }
  if (searchData.intent?.brand_preference) {
    const brands = (memory.preferredBrands || '').split(',').filter(Boolean);
    const brand = searchData.intent.brand_preference;
    if (!brands.includes(brand)) {
      brands.push(brand);
      updates.preferredBrands = brands.slice(-5).join(',');
    }
  }
  if (Object.keys(updates).length > 0) {
    await updateMemory(userId, updates);
  }
}

async function rememberViewedProduct(userId, productId) {
  if (!userId) return;
  const memory = await getMemory(userId);
  const existing = (memory.previousProductIds || '').split(',').filter(Boolean);
  if (!existing.includes(productId)) {
    existing.push(productId);
    await updateMemory(userId, { previousProductIds: existing.slice(-20).join(',') });
  }
}

function personalizeRecommendation(product, memory, intent) {
  if (!memory) return product;
  const brands = (memory.preferredBrands || '').split(',').map(b => b.trim().toLowerCase());
  const disliked = (memory.dislikedBrands || '').split(',').map(b => b.trim().toLowerCase());
  const colors = (memory.favoriteColors || '').split(',').map(c => c.trim().toLowerCase());
  const categories = (memory.favoriteCategories || '').split(',').map(c => c.trim().toLowerCase());
  const sizes = (memory.sizes || '').split(',').map(s => s.trim().toLowerCase());

  let boost = 0;
  if (brands.includes(product.brand.toLowerCase())) boost += 0.1;
  if (disliked.includes(product.brand.toLowerCase())) boost -= 0.3;
  if (colors.length > 0 && product.colors) {
    const prodColors = product.colors.split(',').map(c => c.trim().toLowerCase());
    if (prodColors.some(c => colors.includes(c))) boost += 0.05;
  }
  if (categories.includes(product.category.toLowerCase())) boost += 0.05;

  return { ...product, memoryBoost: boost };
}

module.exports = { getMemory, updateMemory, learnFromSearch, rememberViewedProduct, personalizeRecommendation };
