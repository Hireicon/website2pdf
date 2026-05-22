const dns = require('dns').promises;
const { AppError } = require('./errors');

// Private/reserved IP ranges — NEVER allow Playwright to fetch these
const BLOCKED_RANGES = [
  /^127\./,                    // loopback
  /^10\./,                     // RFC1918
  /^172\.(1[6-9]|2\d|3[01])\./, // RFC1918
  /^192\.168\./,               // RFC1918
  /^169\.254\./,               // link-local (AWS metadata)
  /^0\./,                      // "this" network
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // CGNAT
  /^::1$/,                     // IPv6 loopback
  /^fe80:/i,                   // IPv6 link-local
  /^fc00:/i,                   // IPv6 unique local
];

const BLOCKED_SCHEMES = ['file:', 'ftp:', 'javascript:', 'data:', 'vbscript:'];

/**
 * Validates a user-supplied URL and checks it doesn't resolve to a private IP.
 * Throws AppError if invalid.
 * @param {string} rawUrl
 * @returns {URL} parsed URL
 */
async function validateUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new AppError('URL is required', 400);
  }

  // Normalise — add https if missing
  const urlStr = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;

  let parsed;
  try {
    parsed = new URL(urlStr);
  } catch {
    throw new AppError('Invalid URL format', 400);
  }

  // Block non-http(s) schemes
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new AppError('Only HTTP and HTTPS URLs are allowed', 400);
  }

  // Block explicit blocked schemes (redundant but defence-in-depth)
  if (BLOCKED_SCHEMES.some(s => urlStr.toLowerCase().startsWith(s))) {
    throw new AppError('URL scheme not allowed', 400);
  }

  const hostname = parsed.hostname;

  // Block IP literals that are private
  if (isBlockedIp(hostname)) {
    throw new AppError('URL resolves to a private network address', 400);
  }

  // DNS resolution check — protect against DNS rebinding
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    for (const { address } of addresses) {
      if (isBlockedIp(address)) {
        throw new AppError('URL resolves to a private network address', 400);
      }
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(`Cannot resolve hostname: ${hostname}`, 400);
  }

  return parsed;
}

function isBlockedIp(ip) {
  return BLOCKED_RANGES.some(pattern => pattern.test(ip));
}

module.exports = { validateUrl };
