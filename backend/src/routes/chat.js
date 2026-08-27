/*
 * Chat routes — product AI chat session management.
 *   POST /api/chat              — create a new chat session for a product
 *   GET  /api/chat/:sessionId   — get session + messages
 *   POST /api/chat/:sessionId/message — send a message and get AI response
 */

const express = require('express');
const router = express.Router();
const { createSession, addMessage, getMessages, getSession, generateResponse } = require('../services/chatService');

router.post('/', async (req, res) => {
  try {
    const { productUrl, productName, analysis } = req.body || {};
    if (!productUrl) return res.status(400).json({ error: 'productUrl is required' });

    const session = await createSession({ productUrl, productName, analysis });
    res.json({ ok: true, sessionId: session.sessionId, context: session.context });
  } catch (err) {
    console.error('[chat] create error:', err.message);
    res.status(500).json({ error: 'Failed to create chat session' });
  }
});

router.get('/:sessionId', async (req, res) => {
  try {
    const session = await getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ ok: true, session });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get session' });
  }
});

router.post('/:sessionId/message', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { content, analysis } = req.body || {};
    if (!content) return res.status(400).json({ error: 'content is required' });

    await addMessage({ sessionId, role: 'user', content });

    const response = await generateResponse({ sessionId, userMessage: content, analysis });

    await addMessage({ sessionId, role: 'assistant', content: response });

    res.json({ ok: true, response });
  } catch (err) {
    console.error('[chat] message error:', err.message);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

module.exports = router;
