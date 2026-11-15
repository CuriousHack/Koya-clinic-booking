const { API_KEY } = require('../config/env');

const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const failedAttemptsByIp = new Map();

function rejectAttempt(req, res, message) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const attempts = (failedAttemptsByIp.get(ip) || []).filter((timestamp) => now - timestamp < WINDOW_MS);

  if (attempts.length >= MAX_FAILED_ATTEMPTS) {
    const retryAfter = Math.max(1, Math.ceil((attempts[0] + WINDOW_MS - now) / 1000));
    failedAttemptsByIp.set(ip, attempts);
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({
      error: 'Too many failed API key attempts. Please try again later.',
    });
  }

  attempts.push(now);
  failedAttemptsByIp.set(ip, attempts);
  return res.status(401).json({ error: message });
}

function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.header('x-api-key');
  const validKey = process.env['X-API-Key'] || process.env.X_API_KEY || API_KEY || 'koya-api-key';

  if (!apiKey) {
    return rejectAttempt(req, res, 'Missing X-API-Key header');
  }

  if (apiKey !== validKey) {
    return rejectAttempt(req, res, 'Invalid X-API-Key header');
  }

  // A correct key proves the client is authorized; clear prior failed entries.
  failedAttemptsByIp.delete(req.ip || req.socket?.remoteAddress || 'unknown');
  next();
}

module.exports = apiKeyAuth;
