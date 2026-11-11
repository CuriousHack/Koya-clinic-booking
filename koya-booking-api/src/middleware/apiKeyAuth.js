const { API_KEY } = require('../config/env');

function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.header('x-api-key');
  const validKey = process.env['X-API-Key'] || process.env.X_API_KEY || API_KEY || 'koya-api-key';

  if (!apiKey) {
    return res.status(401).json({
      error: 'Missing X-API-Key header',
    });
  }

  if (apiKey !== validKey) {
    return res.status(401).json({
      error: 'Invalid X-API-Key header',
    });
  }

  next();
}

module.exports = apiKeyAuth;
