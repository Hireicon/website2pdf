const jwt = require('jsonwebtoken');
const { query } = require('../db/connection');
const { AppError } = require('../utils/errors');

/**
 * Verifies Bearer JWT. Attaches req.user if valid.
 * Throws 401 if token missing or invalid.
 */
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401);
    }

    const token = header.slice(7);
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') throw new AppError('Token expired', 401, 'TOKEN_EXPIRED');
      throw new AppError('Invalid token', 401);
    }

    // Fetch user from DB (ensure they still exist + get current plan)
    const [rows] = await query(
      'SELECT id, email, name, plan, email_verified FROM users WHERE id = ?',
      [payload.userId]
    );
    if (!rows.length) throw new AppError('User not found', 401);

    req.user = rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Optional auth — attaches req.user if token present, otherwise continues.
 */
async function optionalAuth(req, res, next) {
  if (req.user) return next(); // already authenticated (e.g., by apiKeyAuth)
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  return authenticate(req, res, next);
}

/**
 * API key auth — checks x-api-key header against api_keys table.
 */
async function apiKeyAuth(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) return next(); // fall through to JWT

    const crypto = require('crypto');
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const [rows] = await query(
      `SELECT ak.id, ak.user_id, ak.calls_today, ak.is_active,
              u.email, u.name, u.plan
       FROM api_keys ak
       JOIN users u ON u.id = ak.user_id
       WHERE ak.key_hash = ? AND ak.is_active = TRUE`,
      [keyHash]
    );

    if (!rows.length) throw new AppError('Invalid API key', 401);

    req.user = { ...rows[0], id: rows[0].user_id };
    req.isApiKey = true;

    // Update last_used async (don't await)
    query('UPDATE api_keys SET last_used = NOW() WHERE id = ?', [rows[0].id]).catch(() => {});

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authenticate, optionalAuth, apiKeyAuth };
