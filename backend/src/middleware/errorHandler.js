const { trackError } = require('../services/analyticsTracker');

const errorHandler = (err, req, res, _next) => {
  console.error('Error:', err);

  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Resource already exists' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Resource not found' });
    }
  }

  const statusCode = err.statusCode || 500;
  const message = err.statusCode ? err.message : 'Internal server error';

  trackError({
    userId: req.user?.id || null,
    endpoint: req.originalUrl || req.url,
    category: statusCode >= 500 ? 'server_error' : 'client_error',
    statusCode,
    message: message.slice(0, 500),
    stack: err.stack,
  });

  res.status(statusCode).json({ error: message });
};

module.exports = { errorHandler };
