const prisma = require('../database');

function safe(fn) {
  return (...args) => {
    try {
      const result = fn(...args);
      if (result && typeof result.catch === 'function') {
        result.catch((e) => console.error('[analytics] tracking error:', e.message));
      }
    } catch (e) {
      console.error('[analytics] tracking error:', e.message);
    }
  };
}

const trackEvent = safe(async (userId, eventType, data = {}) => {
  await prisma.analyticsEvent.create({
    data: {
      userId: userId || null,
      eventType,
      data: typeof data === 'string' ? data : JSON.stringify(data),
    },
  });
});

const trackAnalysis = safe(async ({ userId, url, marketplace, status, startedAt, completedAt, durationMs, failureCategory, aiUsed, cacheHit }) => {
  await prisma.analyticsEvent.create({
    data: {
      userId: userId || null,
      eventType: 'analysis_' + status,
      data: JSON.stringify({
        url: url ? url.slice(0, 200) : undefined,
        marketplace: marketplace || undefined,
        durationMs: durationMs || undefined,
        failureCategory: failureCategory || undefined,
        aiUsed: aiUsed || undefined,
        cacheHit: cacheHit || undefined,
      }),
    },
  });
});

const trackAIUsage = safe(async ({ userId, requestType, model, durationMs, success, tokenCount }) => {
  await prisma.analyticsEvent.create({
    data: {
      userId: userId || null,
      eventType: 'ai_' + requestType,
      data: JSON.stringify({
        model: model || 'gemini',
        durationMs: durationMs || undefined,
        success: success !== false,
        tokenCount: tokenCount || undefined,
      }),
    },
  });
});

const trackError = safe(async ({ userId, endpoint, category, marketplace, statusCode, message, stack }) => {
  await prisma.systemError.create({
    data: {
      userId: userId || null,
      endpoint: endpoint || 'unknown',
      category: category || 'unknown',
      marketplace: marketplace || null,
      statusCode: statusCode || null,
      message: (message || 'unknown').slice(0, 500),
      stack: stack ? String(stack).slice(0, 2000) : null,
    },
  });
});

const trackUserActivity = safe(async (userId, eventType, metadata = {}) => {
  if (!userId) return;
  await prisma.analyticsEvent.create({
    data: {
      userId,
      eventType,
      data: JSON.stringify(metadata),
    },
  });
});

module.exports = {
  trackEvent,
  trackAnalysis,
  trackAIUsage,
  trackError,
  trackUserActivity,
};
