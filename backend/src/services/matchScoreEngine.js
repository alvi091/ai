function calculateMatchScore(product, intent) {
  const requirements = [];

  const addRequirement = (label, matched) => {
    requirements.push({ label, status: matched ? 'Matched' : 'Missing', matched });
  };

  if (intent.usage) {
    const u = intent.usage.toLowerCase();
    if (u.includes('walk') && product.walkingScore > 70) addRequirement('Walking', true);
    else if (u.includes('walk')) addRequirement('Walking', product.walkingScore > 40);
    else if (u.includes('run') && product.runningScore > 70) addRequirement('Running', true);
    else if (u.includes('run')) addRequirement('Running', product.runningScore > 40);
    else addRequirement(intent.usage, false);
  }

  if (intent.weather) {
    const w = intent.weather.toLowerCase();
    if (w.includes('winter') || w.includes('cold')) {
      addRequirement('Winter Ready', product.winterScore > 60);
    }
    if (w.includes('rain') || w.includes('wet')) {
      addRequirement('Waterproof', product.waterproof);
    }
  }

  if (intent.features?.length > 0) {
    const productText = [product.name, product.description, product.features || '', product.category].join(' ').toLowerCase();
    intent.features.forEach(f => {
      addRequirement(f, productText.includes(f.toLowerCase()));
    });
  }

  if (intent.priority) {
    const p = intent.priority.toLowerCase();
    if (p.includes('comfort')) addRequirement('Comfort Focus', product.comfortScore > 60);
    else if (p.includes('durability')) addRequirement('Durable', product.durabilityScore > 60);
    else if (p.includes('budget')) addRequirement('Budget Friendly', product.price < 100);
  }

  if (intent.brand_preference) {
    addRequirement(`Brand: ${intent.brand_preference}`, product.brand.toLowerCase() === intent.brand_preference.toLowerCase());
  }

  if (intent.min_budget && intent.max_budget) {
    addRequirement('Budget Range', product.price >= intent.min_budget && product.price <= intent.max_budget);
  } else if (intent.budget) {
    addRequirement('Within Budget', product.price <= intent.budget);
  }

  const matched = requirements.filter(r => r.matched).length;
  const total = requirements.length || 1;
  const score = Math.round((matched / total) * 100);

  const partialRequirements = requirements.filter(r => !r.matched).map(r => ({ ...r, status: 'Missing' }));
  const matchedRequirements = requirements.filter(r => r.matched);

  return {
    score,
    matched: matchedRequirements,
    missing: partialRequirements,
    total,
    summary: `${score}% match — ${matched} of ${total} requirements met`,
  };
}

module.exports = { calculateMatchScore };
