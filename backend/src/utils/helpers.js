const generateToken = (userId) => {
  const jwt = require('jsonwebtoken');
  const config = require('../config');
  return jwt.sign({ userId }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
};

const sanitizePrompt = (prompt) => {
  return prompt.replace(/[<>&"']/g, '').trim();
};

const parseJsonSafely = (str) => {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
};

const paginate = (page = 1, limit = 20) => {
  const p = Math.max(1, parseInt(page) || 1);
  const l = Math.min(100, parseInt(limit) || 20);
  const skip = (p - 1) * l;
  return { skip, take: l, page: p, limit: l };
};

module.exports = { generateToken, sanitizePrompt, parseJsonSafely, paginate };
