function analyzeLifecycle(product) {
  if (!product.releaseDate) {
    return {
      releaseDate: null,
      age: null,
      expectedSuccessor: product.expectedSuccessor || null,
      recommendation: 'Unknown',
      recommendationLabel: 'Unknown',
    };
  }

  const releaseDate = new Date(product.releaseDate);
  const now = new Date();
  const ageMs = now - releaseDate;
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  const ageYears = ageDays / 365.25;

  const isElectronics = ['Electronics', 'Laptops', 'Phones', 'Tablets'].includes(product.category);
  const typicalCycle = isElectronics ? 365 : 730;
  const successorExpected = ageDays > typicalCycle * 0.8;

  let recommendation;
  let recommendationLabel;

  if (successorExpected && isElectronics) {
    recommendation = 'skip';
    recommendationLabel = 'Skip — successor expected soon';
  } else if (ageDays < typicalCycle * 0.3) {
    recommendation = 'buy';
    recommendationLabel = 'Buy — product lifecycle is early';
  } else if (ageDays < typicalCycle * 0.7) {
    recommendation = 'buy';
    recommendationLabel = 'Buy — still in prime lifecycle';
  } else {
    recommendation = 'wait';
    recommendationLabel = 'Wait — may be replaced soon';
  }

  return {
    releaseDate: releaseDate.toISOString(),
    age: Math.round(ageDays),
    ageYears: Math.round(ageYears * 10) / 10,
    expectedSuccessor: product.expectedSuccessor || (successorExpected ? 'Likely within 3-6 months' : null),
    recommendation,
    recommendationLabel,
  };
}

module.exports = { analyzeLifecycle };
