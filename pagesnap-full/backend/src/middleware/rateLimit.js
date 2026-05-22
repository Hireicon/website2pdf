const rateLimit = require('express-rate-limit');

// Plan-based daily conversion limits
const PLAN_LIMITS = {
  anonymous: 3,
  free:      5,
  pro:       Infinity,
  business:  Infinity,
};

/**
 * General API rate limiter — 100 requests per 15 min per IP.
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

/**
 * Auth endpoints — tighter limit to prevent brute force.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait 15 minutes.' },
  skipSuccessfulRequests: true,
});

/**
 * Conversion rate limiter — enforces plan-based daily limits.
 * Must run after optionalAuth so req.user is available.
 */
async function conversionLimiter(req, res, next) {
  try {
    const { query } = require('../db/connection');
    const plan = req.user?.plan || 'anonymous';
    const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

    if (limit === Infinity) return next(); // Pro/Business — unlimited

    const userId = req.user?.id;

    if (userId) {
      // Reset counter if last reset was yesterday
      await query(`
        UPDATE users
        SET conversions_today = 0, last_reset_at = NOW()
        WHERE id = ? AND (last_reset_at IS NULL OR DATE(last_reset_at) < CURDATE())
      `, [userId]);

      const [rows] = await query('SELECT conversions_today FROM users WHERE id = ?', [userId]);
      const used = rows[0]?.conversions_today || 0;

      if (used >= limit) {
        return res.status(429).json({
          error: `Daily limit reached (${limit}/day on ${plan} plan). Upgrade for unlimited conversions.`,
          code: 'DAILY_LIMIT',
          limit,
          used,
          upgradeUrl: '/pricing',
        });
      }
    } else {
      // Anonymous — check by IP using a simple in-memory store (upgrade to Redis for prod)
      const ip = req.ip;
      if (!global._anonConvCounts) global._anonConvCounts = new Map();
      const today = new Date().toDateString();
      const key = `${ip}:${today}`;
      const count = (global._anonConvCounts.get(key) || 0);
      if (count >= limit) {
        return res.status(429).json({
          error: `Daily limit reached (${limit}/day for guests). Sign up free for more.`,
          code: 'DAILY_LIMIT',
          limit,
          used: count,
          signupUrl: '/register',
        });
      }
      // Increment only after a successful response, consistent with authenticated user behavior
      res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          global._anonConvCounts.set(key, (global._anonConvCounts.get(key) || 0) + 1);
          if (global._anonConvCounts.size > 10000) global._anonConvCounts.clear();
        }
      });
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { generalLimiter, authLimiter, conversionLimiter, PLAN_LIMITS };
