/*
 * Analyze-URL controller — the public entry point for pasting a product URL.
 * POST /api/analyze  { url, prompt? }
 */

const { analyzeUrl } = require('../services/analyzeUrlService');

const analyzeUrlHandler = async (req, res, next) => {
  try {
    const body = req.body || {};
    const url = typeof body.url === 'string' ? body.url.trim() : '';
    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }

    const result = await analyzeUrl({
      url,
      prompt: typeof body.prompt === 'string' ? body.prompt : null,
      user: req.user || null,
      intent: body.intent || {},
    });

    if (!result.ok) {
      return res.status(422).json(result);
    }
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

module.exports = { analyzeUrl: analyzeUrlHandler };