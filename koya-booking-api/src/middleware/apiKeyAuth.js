const { API_KEY } = require('../config/env');
const { timingSafeEqual } = require('crypto');

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
  if (!API_KEY) {
    return res.status(503).json({ error: 'API key is not configured on the server' });
  }

  const apiKey = (req.get('x-api-key') || '').trim();

  if (!apiKey) {
    return rejectAttempt(req, res, 'Missing X-API-Key header');
  }

  const providedKeyBuffer = Buffer.from(apiKey);
  const configuredKeyBuffer = Buffer.from(API_KEY);
  const matches = providedKeyBuffer.length === configuredKeyBuffer.length
    && timingSafeEqual(providedKeyBuffer, configuredKeyBuffer);

  if (!matches) {
    return rejectAttempt(req, res, 'Invalid X-API-Key header');
  }

  // A correct key proves the client is authorized; clear prior failed entries.
  failedAttemptsByIp.delete(req.ip || req.socket?.remoteAddress || 'unknown');
  next();
}

module.exports = apiKeyAuth;
