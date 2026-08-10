const PERSONAS = [
  { id: 'budget_shopper', label: 'Budget Shopper', keywords: ['budget', 'cheap', 'affordable', 'value', 'cheapest', 'low price', 'under', 'save'], priceThreshold: 50 },
  { id: 'luxury_buyer', label: 'Luxury Buyer', keywords: ['luxury', 'premium', 'high-end', 'expensive', 'best', 'top', 'designer'], priceThreshold: 500 },
  { id: 'minimalist', label: 'Minimalist', keywords: ['minimal', 'simple', 'clean', 'basic', 'essential', 'neutral'], brandAffinity: ['muji', 'ikea', 'apple'] },
  { id: 'tech_enthusiast', label: 'Tech Enthusiast', keywords: ['tech', 'gadget', 'smart', 'wireless', 'bluetooth', 'digital', 'electronic', 'gaming'], categoryAffinity: ['Electronics'] },
  { id: 'traveler', label: 'Traveler', keywords: ['travel', 'portable', 'lightweight', 'compact', 'carry', 'luggage', 'backpack', 'outdoor'], categoryAffinity: ['Sports & Outdoors', 'Travel'] },
  { id: 'fitness_lover', label: 'Fitness Lover', keywords: ['fitness', 'gym', 'workout', 'running', 'sport', 'exercise', 'yoga', 'athletic'], categoryAffinity: ['Sports & Outdoors', 'Fashion'] },
  { id: 'student', label: 'Student', keywords: ['student', 'college', 'school', 'study', 'dorm', 'campus', 'budget'], priceThreshold: 200 },
  { id: 'office_worker', label: 'Office Worker', keywords: ['office', 'work', 'professional', 'business', 'corporate', 'desk', 'ergonomic'], categoryAffinity: ['Home & Kitchen', 'Electronics'] },
];

function classifyPersona(userData, searchHistory = []) {
  const text = [
    userData.name || '',
    ...searchHistory.map(s => s.prompt || ''),
  ].join(' ').toLowerCase();

  const personaScores = PERSONAS.map(persona => {
    let score = 0;
    persona.keywords.forEach(kw => {
      if (text.includes(kw)) score += 10;
    });
    if (persona.priceThreshold && userData.budgetMax && userData.budgetMax <= persona.priceThreshold) score += 20;
    if (persona.priceThreshold && userData.budgetMin && userData.budgetMin > persona.priceThreshold * 0.5) score -= 5;
    return { ...persona, score };
  });

  personaScores.sort((a, b) => b.score - a.score);
  const primary = personaScores[0];
  const secondary = personaScores[1];

  if (primary.score < 5) return { primary: null, secondary: null, label: 'General Shopper' };

  return {
    primary: primary.id,
    secondary: secondary?.id || null,
    label: primary.label,
    score: primary.score,
  };
}

function getPersonaById(id) {
  return PERSONAS.find(p => p.id === id) || null;
}

module.exports = { classifyPersona, getPersonaById, PERSONAS };
