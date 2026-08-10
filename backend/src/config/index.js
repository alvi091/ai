require('dotenv').config();

const rawCors = process.env.CORS_ORIGIN || 'http://localhost:5173';
const corsOrigin = rawCors
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-do-not-use-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },
  llm: {
    provider: process.env.LLM_PROVIDER || 'gemini',
    openaiKey: process.env.OPENAI_API_KEY || '',
    geminiKey: process.env.GEMINI_API_KEY || '',
    claudeKey: process.env.ANTHROPIC_API_KEY || '',
    groqKey: process.env.GROQ_API_KEY || '',
  },
  crawler: {
    timeoutMs: parseInt(process.env.CRAWL_TIMEOUT_MS, 10) || 20000,
    maxRedirects: parseInt(process.env.CRAWL_MAX_REDIRECTS, 10) || 5,
    userAgent:
      process.env.CRAWL_USER_AGENT ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    playwrightEnabled: process.env.PLAYWRIGHT_ENABLED !== 'false',
    minHtmlBytes: parseInt(process.env.CRAWL_MIN_HTML_BYTES, 10) || 8000,
    maxHtmlBytes: parseInt(process.env.CRAWL_MAX_HTML_BYTES, 10) || 6 * 1024 * 1024,
    maxReviews: parseInt(process.env.CRAWL_MAX_REVIEWS, 10) || 60,
  },
  analysis: {
    llmEnabled: process.env.ANALYSIS_LLM_ENABLED !== 'false',
    allowGenericSites: process.env.ANALYZE_ALLOW_GENERIC === 'true',
  },
  amazon: {
    rapidApiKey: process.env.RAPIDAPI_KEY || '',
    rapidApiHost: process.env.RAPIDAPI_HOST || 'real-time-amazon-data.p.rapidapi.com',
    country: process.env.AMAZON_COUNTRY || 'US',
  },
  cors: {
    origin: corsOrigin.length === 1 ? corsOrigin[0] : corsOrigin,
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
};
