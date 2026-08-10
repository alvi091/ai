function generateWhyNotBuy(product, intent = {}) {
  const reasons = [];

  if (!product.inStock) reasons.push('Currently out of stock');
  if (product.stockLevel !== null && product.stockLevel !== undefined && product.stockLevel < 5) reasons.push('Very low stock — may be discontinued');

  if (product.weight && product.weight > 800) reasons.push(`Heavy (${product.weight}g) — not ideal for portability`);
  if (product.weight && product.weight > 1200) reasons.push(`Very heavy (${product.weight}g) — significant weight concern`);

  if (product.batteryScore !== null && product.batteryScore !== undefined && product.batteryScore < 40) reasons.push('Poor battery life reported');

  if (!product.waterproof && intent.weather?.toLowerCase().includes('rain')) reasons.push('Not waterproof — unsuitable for wet conditions');

  if (product.warrantyScore !== null && product.warrantyScore !== undefined && product.warrantyScore < 40) reasons.push('Weak warranty coverage');

  if (product.wideFeet === false && intent.features?.some(f => f.toLowerCase().includes('wide'))) reasons.push('Not designed for wide feet');

  if (product.durabilityScore < 40) reasons.push('Below average durability — may not last long');

  if (product.rating < 3.5) reasons.push(`Low rating (${product.rating}/5) — many users dissatisfied`);

  if (product.returnRate !== null && product.returnRate !== undefined && product.returnRate > 0.15) reasons.push(`High return rate (${Math.round(product.returnRate * 100)}%)`);

  if (product.originalPrice && product.price >= product.originalPrice) reasons.push('No discount available — paying full price');

  if (product.price > 500 && !intent.max_budget) reasons.push(`Expensive at $${product.price} — consider if you really need it`);

  if (product.price > (intent.max_budget || Infinity)) reasons.push(`Over budget at $${product.price}`);

  const productText = (product.description || '').toLowerCase();
  if (productText.includes('runs small') || productText.includes('size down')) reasons.push('Reported to run small — sizing issues');
  if (productText.includes('noisy') || productText.includes('loud')) reasons.push('Reported to be noisy');

  if (reasons.length === 0) {
    reasons.push('No significant drawbacks identified for this product');
  }

  return {
    reasons: reasons.slice(0, 8),
    totalConcerns: reasons.length,
    hasConcerns: reasons.length > 1 || (reasons.length === 1 && !reasons[0].includes('No significant drawbacks')),
  };
}

module.exports = { generateWhyNotBuy };
