/**
 * Simple in-memory rate limiter for the auth endpoints.
 * For production, swap this with a Redis-backed solution.
 */
const store = new Map();

function rateLimit({ windowMs = 15 * 60 * 1000, max = 15, message = 'Too many requests' } = {}) {
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    const entry = store.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + windowMs;
    }

    entry.count++;
    store.set(key, entry);

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set('Retry-After', retryAfter);
      return res.status(429).json({ error: message, retryAfter });
    }

    next();
  };
}

module.exports = { rateLimit };
