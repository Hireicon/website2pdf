const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { query } = require('../db/connection');
const { authenticate } = require('../middleware/auth');
const { AppError } = require('../utils/errors');

// GET /api/v1/user/profile
router.get('/profile', authenticate, async (req, res, next) => {
  try {
    const [rows] = await query(
      `SELECT id, email, name, plan, conversions_today, email_verified, created_at
       FROM users WHERE id = ?`,
      [req.user.id]
    );
    if (!rows.length) throw new AppError('User not found', 404);

    const [[{ total }]] = await query(
      'SELECT COUNT(*) as total FROM conversions WHERE user_id = ?',
      [req.user.id]
    );

    res.json({ user: { ...rows[0], totalConversions: total } });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/user/api-keys
router.get('/api-keys', authenticate, async (req, res, next) => {
  try {
    const [rows] = await query(
      `SELECT id, name, calls_today, last_used, is_active, created_at
       FROM api_keys WHERE user_id = ? ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ apiKeys: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/user/api-keys
router.post('/api-keys', authenticate, async (req, res, next) => {
  try {
    if (req.user.plan === 'free') {
      throw new AppError('API access requires Pro or Business plan', 403);
    }

    const [existing] = await query(
      'SELECT COUNT(*) as count FROM api_keys WHERE user_id = ? AND is_active = TRUE',
      [req.user.id]
    );
    if (existing[0].count >= 5) {
      throw new AppError('Maximum 5 active API keys allowed', 400);
    }

    // Generate a readable key: ps_live_<32 hex chars>
    const rawKey = `ps_live_${crypto.randomBytes(16).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const name = req.body.name || 'Default';

    const [result] = await query(
      'INSERT INTO api_keys (user_id, key_hash, name) VALUES (?, ?, ?)',
      [req.user.id, keyHash, name]
    );

    // Return the raw key ONCE — never stored in plaintext
    res.status(201).json({
      id: result.insertId,
      name,
      key: rawKey, // shown once only
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/user/api-keys/:keyId
router.delete('/api-keys/:keyId', authenticate, async (req, res, next) => {
  try {
    const [rows] = await query(
      'SELECT id, user_id FROM api_keys WHERE id = ?',
      [req.params.keyId]
    );
    if (!rows.length) throw new AppError('API key not found', 404);
    if (rows[0].user_id !== req.user.id) throw new AppError('Not authorised', 403);

    await query('UPDATE api_keys SET is_active = FALSE WHERE id = ?', [req.params.keyId]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
