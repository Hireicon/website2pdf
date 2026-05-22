const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../db/connection');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const { AppError } = require('../utils/errors');
const { z } = require('zod');

const registerSchema = z.object({
  email:    z.string().email().max(255),
  password: z.string().min(8).max(72),
  name:     z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

function generateTokens(userId) {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
  );
  return { accessToken, refreshToken };
}

// POST /api/v1/auth/register
router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError(parsed.error.errors[0].message, 400);

    const { email, password, name } = parsed.data;
    const emailLower = email.toLowerCase();

    const [existing] = await query('SELECT id FROM users WHERE email = ?', [emailLower]);
    if (existing.length) throw new AppError('An account with this email already exists', 409);

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await query(
      'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
      [emailLower, passwordHash, name || null]
    );

    const { accessToken, refreshToken } = generateTokens(result.insertId);

    // Store refresh token hash
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [result.insertId, tokenHash, expiresAt]
    );

    res.status(201).json({
      user: { id: result.insertId, email: emailLower, name: name || null, plan: 'free' },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/login
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw new AppError('Invalid email or password', 400);

    const { email, password } = parsed.data;
    const [rows] = await query(
      'SELECT id, email, name, plan, password_hash FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    // Constant-time compare to prevent timing attacks
    const dummyHash = '$2a$12$dummyhashfordummycomparison000000000000000';
    const hash = rows[0]?.password_hash || dummyHash;
    const valid = await bcrypt.compare(password, hash);

    if (!rows.length || !valid) throw new AppError('Invalid email or password', 401);

    const user = rows[0];
    const { accessToken, refreshToken } = generateTokens(user.id);

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [user.id, tokenHash, expiresAt]
    );

    res.json({
      user: { id: user.id, email: user.email, name: user.name, plan: user.plan },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AppError('Refresh token required', 400);

    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const [rows] = await query(
      'SELECT id FROM refresh_tokens WHERE token_hash = ? AND revoked = FALSE AND expires_at > NOW()',
      [tokenHash]
    );
    if (!rows.length) throw new AppError('Refresh token revoked or expired', 401);

    // Rotate: revoke old, issue new
    await query('UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = ?', [tokenHash]);

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(payload.userId);
    const newHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [payload.userId, newHash, expiresAt]
    );

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/auth/logout
router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await query('UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = ?', [tokenHash]);
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
