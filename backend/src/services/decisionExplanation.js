function generateExplanation(product, intent, suitability, alternatives = []) {
  const whyThis = [];
  const whyNotOthers = [];
  const tradeoffs = [];
  const whoShouldAvoid = [];
  const whoIsThisPerfectFor = [];

  if (suitability && suitability.score >= 70) {
    whyThis.push(`This product scores ${suitability.score}% suitability for your needs`);
  }
  if (product.rating >= 4) {
    whyThis.push(`Excellent ${product.rating}/5 rating from ${product.reviews || 'many'} reviews`);
  }
  if (product.comfortScore > 70) {
    whyThis.push('Highly rated for comfort');
  }
  if (product.durabilityScore > 70) {
    whyThis.push('Exceptional durability reported');
  }
  if (product.originalPrice && product.price < product.originalPrice) {
    const discount = Math.round((1 - product.price / product.originalPrice) * 100);
    whyThis.push(`Currently at ${discount}% discount — great value`);
  }

  if (alternatives && alternatives.length > 0) {
    alternatives.slice(0, 2).forEach(alt => {
      if (alt.price < product.price) {
        whyNotOthers.push(`${alt.name} is more affordable at $${alt.price}`);
      } else if (alt.rating > product.rating) {
        whyNotOthers.push(`${alt.name} has better reviews (${alt.rating}/5 vs ${product.rating}/5)`);
      }
    });
  }

  tradeoffs.push(`Price: $${product.price}${product.originalPrice ? ` (was $${product.originalPrice})` : ''}`);
  if (product.weight) tradeoffs.push(`Weight: ${product.weight}g`);
  if (product.batteryScore !== null && product.batteryScore !== undefined) {
    tradeoffs.push(product.batteryScore > 60 ? 'Good battery life' : 'Below average battery life');
  }

  if (product.rating < 3.5) whoShouldAvoid.push('Shoppers who prioritize high-rated products');
  if (product.price > 300) whoShouldAvoid.push('Budget-conscious shoppers (premium price point)');
  if (product.weight && product.weight > 500) whoShouldAvoid.push('Those needing lightweight products');
  if (!product.waterproof && intent?.weather?.toLowerCase().includes('rain')) whoShouldAvoid.push('Anyone needing waterproof gear');

  const perfectScore = [];
  if (suitability && suitability.score >= 80) perfectScore.push('suitability score is excellent');
  if (product.rating >= 4.5) perfectScore.push('ratings are outstanding');
  if (product.price <= (intent?.budget || Infinity)) perfectScore.push('fits within budget');
  if (product.comfortScore > 70) perfectScore.push('comfort is a priority');
  if (product.durabilityScore > 70) perfectScore.push('long-term durability matters');

  if (perfectScore.length >= 2) {
    whoIsThisPerfectFor.push(`This is ideal if your ${perfectScore.join(' and ')}`);
  }

  return {
    whyThis: whyThis.length > 0 ? whyThis : ['Based on your requirements, this product is a strong match'],
    whyNotOthers: whyNotOthers.length > 0 ? whyNotOthers : ['Consider the alternatives if on a tighter budget'],
    tradeoffs,
    whoShouldAvoid: whoShouldAvoid.length > 0 ? whoShouldAvoid : ['No major exclusions identified'],
    whoIsThisPerfectFor: whoIsThisPerfectFor.length > 0 ? whoIsThisPerfectFor : ['Anyone looking for a solid product in this category'],
  };
}

module.exports = { generateExplanation };
