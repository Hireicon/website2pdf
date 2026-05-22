const express = require('express');
const router = express.Router();
const path = require('path');
const { query } = require('../db/connection');
const { getLocalPath } = require('../services/StorageService');
const { optionalAuth, authenticate } = require('../middleware/auth');
const { AppError } = require('../utils/errors');

// GET /api/v1/share/:shareId — public metadata
router.get('/:shareId', async (req, res, next) => {
  try {
    const { shareId } = req.params;
    const [rows] = await query(
      `SELECT sl.share_id, sl.download_count, sl.expires_at, sl.is_active,
              c.original_url, c.page_title, c.file_size_kb, c.format,
              c.reader_mode, c.created_at
       FROM share_links sl
       JOIN conversions c ON c.id = sl.conversion_id
       WHERE sl.share_id = ?`,
      [shareId]
    );

    if (!rows.length) throw new AppError('Share link not found', 404);
    const link = rows[0];

    if (!link.is_active) throw new AppError('This link has been revoked', 410);
    if (new Date(link.expires_at) < new Date()) {
      throw new AppError('This link has expired', 410);
    }

    res.json({
      shareId:       link.share_id,
      pageTitle:     link.page_title,
      originalUrl:   link.original_url,
      format:        link.format,
      readerMode:    !!link.reader_mode,
      fileSizeKB:    link.file_size_kb,
      downloadCount: link.download_count,
      expiresAt:     link.expires_at,
      createdAt:     link.created_at,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/share/:shareId/download — serve the PDF
router.get('/:shareId/download', async (req, res, next) => {
  try {
    const { shareId } = req.params;
    const [rows] = await query(
      `SELECT sl.is_active, sl.expires_at,
              c.storage_path, c.page_title, c.original_url
       FROM share_links sl
       JOIN conversions c ON c.id = sl.conversion_id
       WHERE sl.share_id = ?`,
      [shareId]
    );

    if (!rows.length) throw new AppError('Share link not found', 404);
    const link = rows[0];

    if (!link.is_active) throw new AppError('This link has been revoked', 410);
    if (new Date(link.expires_at) < new Date()) {
      throw new AppError('This link has expired', 410);
    }

    // Increment download count async
    query('UPDATE share_links SET download_count = download_count + 1 WHERE share_id = ?',
      [shareId]).catch(() => {});

    if (process.env.STORAGE_BACKEND === 'r2') {
      const { getStorageUrl } = require('../services/StorageService');
      return res.redirect(getStorageUrl(link.storage_path));
    }

    // Local file
    const filepath = getLocalPath(link.storage_path);
    const hostname = new URL(link.original_url).hostname;
    const filename = `pagesnap-${hostname}.pdf`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.sendFile(path.resolve(filepath), (err) => {
      if (err && !res.headersSent) {
        next(new AppError('File not found', 404));
      }
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/share/:shareId — update expiry (owner only)
router.patch('/:shareId', authenticate, async (req, res, next) => {
  try {
    const { shareId } = req.params;
    const [rows] = await query(
      `SELECT sl.id, c.user_id FROM share_links sl
       JOIN conversions c ON c.id = sl.conversion_id
       WHERE sl.share_id = ?`,
      [shareId]
    );

    if (!rows.length) throw new AppError('Share link not found', 404);
    if (rows[0].user_id !== req.user.id) throw new AppError('Not authorised', 403);

    // Extend expiry based on plan
    const PLAN_DAYS = { free: 1, pro: 30, business: 3650 };
    const days = PLAN_DAYS[req.user.plan] || 1;
    const newExpiry = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await query('UPDATE share_links SET expires_at = ? WHERE share_id = ?',
      [newExpiry, shareId]);

    res.json({ expiresAt: newExpiry.toISOString() });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/share/:shareId — revoke link (owner only)
router.delete('/:shareId', authenticate, async (req, res, next) => {
  try {
    const { shareId } = req.params;
    const [rows] = await query(
      `SELECT sl.id, c.user_id FROM share_links sl
       JOIN conversions c ON c.id = sl.conversion_id
       WHERE sl.share_id = ?`,
      [shareId]
    );

    if (!rows.length) throw new AppError('Share link not found', 404);
    if (rows[0].user_id !== req.user.id) throw new AppError('Not authorised', 403);

    await query("UPDATE share_links SET is_active = FALSE WHERE share_id = ?", [shareId]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
