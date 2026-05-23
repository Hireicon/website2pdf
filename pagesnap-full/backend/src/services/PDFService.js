const { chromium } = require('playwright');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');

const MAX_CONCURRENT_PAGES = 5;
const NAVIGATION_TIMEOUT = 45000; // 45s
const NETWORKIDLE_TIMEOUT = 15000; // 15s — give up on networkidle, fall back to load
const PDF_TIMEOUT = 60000;        // 60s

// Reader mode CSS — strips nav, ads, cookie banners
const READER_MODE_CSS = `
  header, nav, footer, .nav, .navbar, .header, .footer,
  [class*="navigation"], [id*="navigation"],
  .ads, .ad, .advertisement, [class*="banner"],
  [class*="cookie"], [id*="cookie"], [class*="gdpr"],
  .sidebar, [class*="sidebar"],
  [class*="social-share"], [class*="share-bar"],
  [class*="related-posts"], [class*="recommended"],
  [class*="popup"], [class*="modal"], [class*="overlay"],
  [class*="newsletter"], [class*="subscribe"],
  [class*="sticky"], [class*="fixed-header"] {
    display: none !important;
  }
  body, article, main, .content, .post-content, .article-body {
    max-width: 800px !important;
    margin: 0 auto !important;
    padding: 24px !important;
    font-family: Georgia, 'Times New Roman', serif !important;
    font-size: 18px !important;
    line-height: 1.8 !important;
  }
  img { max-width: 100% !important; height: auto !important; }
  pre, code { white-space: pre-wrap !important; word-break: break-word !important; }
`;

let browserInstance = null;
let activePages = 0;
const pageQueue = [];

async function getBrowser() {
  if (browserInstance && browserInstance.isConnected()) {
    return browserInstance;
  }
  logger.info('Launching Playwright Chromium browser');
  browserInstance = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
    ],
  });
  browserInstance.on('disconnected', () => {
    logger.warn('Browser disconnected — will relaunch on next request');
    browserInstance = null;
  });
  return browserInstance;
}

/**
 * Acquire a page slot (respects MAX_CONCURRENT_PAGES).
 */
function acquirePage() {
  return new Promise((resolve) => {
    if (activePages < MAX_CONCURRENT_PAGES) {
      activePages++;
      resolve();
    } else {
      pageQueue.push(resolve);
    }
  });
}

function releasePage() {
  activePages--;
  if (pageQueue.length > 0) {
    const next = pageQueue.shift();
    activePages++;
    next();
  }
}

/**
 * Convert a URL to PDF.
 * @param {URL}    parsedUrl  - validated URL from urlValidator
 * @param {object} options    - { format, readerMode }
 * @returns {{ buffer: Buffer, renderMs: number, pageTitle: string }}
 */
async function convertUrlToPdf(parsedUrl, options = {}) {
  const { format = 'A3', readerMode = false } = options;
  const startTime = Date.now();

  await acquirePage();

  let page;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    // Set a realistic viewport
    await page.setViewportSize({ width: 1280, height: 900 });

    // Block image/font loading in reader mode for speed (optional)
    if (readerMode) {
      await page.route('**/*.{woff,woff2,ttf,eot}', route => route.abort());
    }

    // Navigate — try networkidle first (better rendering), fall back to load for SPAs
    try {
      await page.goto(parsedUrl.href, {
        waitUntil: 'networkidle',
        timeout: NETWORKIDLE_TIMEOUT,
      });
    } catch {
      // SPAs and pages with persistent connections never reach networkidle — proceed anyway
      await page.waitForLoadState('load', { timeout: NAVIGATION_TIMEOUT });
    }

    // Get page title
    const pageTitle = await page.title().catch(() => parsedUrl.hostname);

    // Inject reader mode styles
    if (readerMode) {
      await page.addStyleTag({ content: READER_MODE_CSS });
      // Small delay for style application
      await page.waitForTimeout(300);
    }

    // Generate PDF buffer
    const buffer = await page.pdf({
      format,
      printBackground: !readerMode,
      margin: readerMode
        ? { top: '40px', bottom: '40px', left: '40px', right: '40px' }
        : { top: '20px', bottom: '20px', left: '20px', right: '20px' },
      timeout: PDF_TIMEOUT,
    });

    const renderMs = Date.now() - startTime;
    logger.debug('PDF rendered', { url: parsedUrl.hostname, renderMs, readerMode });

    return { buffer, renderMs, pageTitle: pageTitle.slice(0, 255) };

  } catch (err) {
    logger.error('PDF render failed', { hostname: parsedUrl.hostname, error: err.message });

    if (err.message.includes('Timeout') || err.message.includes('timeout')) {
      throw new AppError('Page took too long to load. Try again or use reader mode.', 408);
    }
    if (err.message.includes('net::ERR')) {
      throw new AppError('Could not reach the webpage. Check the URL and try again.', 400);
    }
    throw new AppError('Failed to render PDF. The page may be incompatible.', 500);

  } finally {
    if (page) await page.close().catch(() => {});
    releasePage();
  }
}

/**
 * Graceful shutdown — close browser on process exit.
 */
async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close().catch(() => {});
    browserInstance = null;
  }
}

process.on('SIGTERM', closeBrowser);
process.on('SIGINT', closeBrowser);

module.exports = { convertUrlToPdf, closeBrowser };
