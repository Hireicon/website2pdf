const express = require('express');
const router = express.Router();
const { customAlphabet } = require('nanoid');
const { validateUrl } = require('../utils/urlValidator');
const { convertUrlToPdf } = require('../services/PDFService');
const { savePdf, getFileSizeKB } = require('../services/StorageService');
const { optionalAuth, apiKeyAuth } = require('../middleware/auth');
const { conversionLimiter } = require('../middleware/rateLimit');
const { query } = require('../db/connection');
const { AppError } = require('../utils/errors');
const crypto = require('crypto');
const { z } = require('zod');

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8);

// Request schema
const convertSchema = z.object({
  url:        z.string().min(3).max(2048),
  format:     z.enum(['A4', 'Letter', 'A3']).optional().default('A3'),
  readerMode: z.boolean().optional().default(false),
});

// Plan-based link expiry durations (ms)
const EXPIRY_MS = {
  anonymous: 24 * 60 * 60 * 1000,         // 24h
  free:      24 * 60 * 60 * 1000,         // 24h
  pro:       30 * 24 * 60 * 60 * 1000,    // 30 days
  business:  100 * 365 * 24 * 60 * 60 * 1000, // ~permanent
};

// POST /api/v1/convert
router.post('/', apiKeyAuth, optionalAuth, conversionLimiter, async (req, res, next) => {
  try {
    // Validate request body
    const parsed = convertSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 400);
    }
    const { url, format, readerMode } = parsed.data;

    // SSRF protection — validate URL before touching Playwright
    const parsedUrl = await validateUrl(url);

    // Hash IP for logging (never store plain)
    const ipHash = crypto.createHash('sha256').update(req.ip || '').digest('hex').slice(0, 16);

    // Create pending conversion record
    const [result] = await query(
      `INSERT INTO conversions (user_id, original_url, format, reader_mode, status, ip_hash, storage_path)
       VALUES (?, ?, ?, ?, 'pending', ?, '')`,
      [req.user?.id || null, parsedUrl.href, format, readerMode ? 1 : 0, ipHash]
    );
    const conversionId = result.insertId;

    // Render PDF
    let buffer, renderMs, pageTitle;
    try {
      ({ buffer, renderMs, pageTitle } = await convertUrlToPdf(parsedUrl, { format, readerMode }));
    } catch (renderErr) {
      await query("UPDATE conversions SET status='error', error_msg=? WHERE id=?",
        [renderErr.message, conversionId]);
      throw renderErr;
    }

    // Generate share ID and save file
    const shareId = nanoid();
    const storageKey = await savePdf(shareId, buffer);
    const fileSizeKB = await getFileSizeKB(storageKey) || Math.round(buffer.length / 1024);

    // Update conversion record
    await query(
      `UPDATE conversions
       SET status='done', storage_path=?, file_size_kb=?, render_ms=?, page_title=?
       WHERE id=?`,
      [storageKey, fileSizeKB, renderMs, pageTitle, conversionId]
    );

    // Create share link record
    const plan = req.user?.plan || 'anonymous';
    const expiresAt = new Date(Date.now() + (EXPIRY_MS[plan] ?? EXPIRY_MS.free));

    await query(
      `INSERT INTO share_links (share_id, conversion_id, expires_at)
       VALUES (?, ?, ?)`,
      [shareId, conversionId, expiresAt]
    );

    // Increment user's daily conversion count
    if (req.user?.id) {
      await query(
        `UPDATE users SET conversions_today = conversions_today + 1,
         last_reset_at = COALESCE(last_reset_at, NOW())
         WHERE id = ?`,
        [req.user.id]
      );
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    res.json({
      success:     true,
      shareId,
      shareUrl:    `${baseUrl}/share/${shareId}`,
      downloadUrl: `${baseUrl}/api/v1/share/${shareId}/download`,
      pageTitle,
      fileSizeKB,
      renderMs,
      format,
      expiresAt:   expiresAt.toISOString(),
    });

  } catch (err) {
    next(err);
  }
});

// GET /api/v1/convert — conversion history (auth required)
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    if (!req.user) throw new AppError('Authentication required', 401);

    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    const [rows] = await query(
      `SELECT c.id, c.original_url, c.page_title, c.format, c.reader_mode,
              c.file_size_kb, c.render_ms, c.status, c.created_at,
              sl.share_id, sl.expires_at, sl.download_count, sl.is_active
       FROM conversions c
       LEFT JOIN share_links sl ON sl.conversion_id = c.id
       WHERE c.user_id = ?
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, limit, offset]
    );

    const [[{ total }]] = await query(
      'SELECT COUNT(*) as total FROM conversions WHERE user_id = ?',
      [req.user.id]
    );

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    res.json({
      data: rows.map(r => ({
        ...r,
        shareUrl:    r.share_id ? `${baseUrl}/share/${r.share_id}` : null,
        downloadUrl: r.share_id ? `${baseUrl}/api/v1/share/${r.share_id}/download` : null,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
