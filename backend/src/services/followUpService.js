const AIService = require('../ai/AIService');

const INTENT_QUESTIONS = {
  walking: ['Walking or Running?', 'Flat feet or high arches?', 'Indoor or outdoor use?'],
  running: ['Road or trail running?', 'Distance per week?', 'Overpronation or neutral?'],
  gaming: ['PC or console gaming?', 'Competitive or casual?', 'Wireless or wired?'],
  laptop: ['Mac or Windows?', 'Battery life priority?', 'Gaming or productivity?'],
  shoes: ['Daily usage (hours)?', 'Surface type?', 'Wide feet?'],
  jacket: ['Insulation type?', 'Waterproof required?', 'City or outdoor use?'],
};

function getRelevantQuestions(intent) {
  const questions = [];
  const usage = (intent.usage || '').toLowerCase();

  for (const [key, qs] of Object.entries(INTENT_QUESTIONS)) {
    if (usage.includes(key) || (intent.category && intent.category.toLowerCase().includes(key))) {
      questions.push(...qs);
    }
  }

  if (intent.features && intent.features.length === 0) {
    questions.push('Any specific features you need?');
  }

  if (!intent.budget && !intent.max_budget) {
    questions.push('What is your maximum budget?');
  }

  return questions.slice(0, 3);
}

async function getAIQuestions(intent) {
  try {
    const ai = AIService.create('gemini');
    return await ai.generateFollowUpQuestions(intent);
  } catch {
    return getRelevantQuestions(intent);
  }
}

module.exports = { getRelevantQuestions, getAIQuestions };
