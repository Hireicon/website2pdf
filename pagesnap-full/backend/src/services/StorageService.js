const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

const LOCAL_DIR = path.resolve(process.env.STORAGE_LOCAL_DIR || './storage');

// Ensure storage directory exists
fs.mkdir(LOCAL_DIR, { recursive: true }).catch(() => {});

/**
 * Save a PDF buffer and return the storage key.
 * @param {string} shareId
 * @param {Buffer} buffer
 * @returns {Promise<string>} storage key / path
 */
async function savePdf(shareId, buffer) {
  if (process.env.STORAGE_BACKEND === 'r2') {
    return saveToR2(shareId, buffer);
  }
  return saveLocally(shareId, buffer);
}

async function saveLocally(shareId, buffer) {
  const filename = `${shareId}.pdf`;
  const filepath = path.join(LOCAL_DIR, filename);
  await fs.writeFile(filepath, buffer);
  logger.debug('PDF saved locally', { filename, sizeKB: Math.round(buffer.length / 1024) });
  return filename; // storage key
}

async function saveToR2(shareId, buffer) {
  // Requires: @aws-sdk/client-s3
  // Install: npm install @aws-sdk/client-s3
  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY,
      secretAccessKey: process.env.R2_SECRET_KEY,
    },
  });
  const key = `pdfs/${shareId}.pdf`;
  await client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: 'application/pdf',
  }));
  return key;
}

/**
 * Get the public URL or local path for serving a PDF.
 * @param {string} storageKey
 * @returns {string}
 */
function getStorageUrl(storageKey) {
  if (process.env.STORAGE_BACKEND === 'r2') {
    return `${process.env.R2_PUBLIC_URL}/${storageKey}`;
  }
  // Served by Express static handler at /files/
  return null; // handled by download endpoint
}

/**
 * Get absolute local path for a storage key.
 */
function getLocalPath(storageKey) {
  return path.join(LOCAL_DIR, storageKey);
}

/**
 * Delete a PDF from storage.
 * @param {string} storageKey
 */
async function deletePdf(storageKey) {
  if (process.env.STORAGE_BACKEND === 'r2') {
    // TODO: S3 DeleteObjectCommand
    return;
  }
  const filepath = path.join(LOCAL_DIR, storageKey);
  await fs.unlink(filepath).catch(() => {}); // silent if already gone
  logger.debug('PDF deleted', { storageKey });
}

/**
 * Get file size in KB.
 */
async function getFileSizeKB(storageKey) {
  if (process.env.STORAGE_BACKEND === 'r2') return null;
  try {
    const stat = await fs.stat(path.join(LOCAL_DIR, storageKey));
    return Math.round(stat.size / 1024);
  } catch {
    return null;
  }
}

module.exports = { savePdf, getStorageUrl, getLocalPath, deletePdf, getFileSizeKB };
