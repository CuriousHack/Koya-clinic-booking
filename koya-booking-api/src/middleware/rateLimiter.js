// In-memory sliding window rate limiter: at most 5 attempts per email per minute
const attemptsByEmail = new Map();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_ATTEMPTS = 5;

function bookingRateLimiter(req, res, next) {
  const rawEmail = req.body?.email || req.body?.patientEmail;

  // If no email provided, pass through to let controller handle missing field validation (400)
  if (!rawEmail || typeof rawEmail !== 'string') {
    return next();
  }

  const email = rawEmail.trim().toLowerCase();
  const now = Date.now();

  let timestamps = attemptsByEmail.get(email) || [];
  // Retain only timestamps within the last 60 seconds
  timestamps = timestamps.filter((time) => now - time < WINDOW_MS);

  // If already at or exceeding 5 attempts within the 60s window
  if (timestamps.length >= MAX_ATTEMPTS) {
    const oldestTimestamp = timestamps[0];
    const msRemaining = oldestTimestamp + WINDOW_MS - now;
    const retryAfterSeconds = Math.max(1, Math.ceil(msRemaining / 1000));

    res.setHeader('Retry-After', String(retryAfterSeconds));
    return res.status(429).json({
      error: 'Too many booking attempts. Please try again later.',
    });
  }

  // Count this attempt (failed attempts included)
  timestamps.push(now);
  attemptsByEmail.set(email, timestamps);

  next();
}

function clearAttempts() {
  attemptsByEmail.clear();
}

module.exports = {
  bookingRateLimiter,
  clearAttempts,
};
