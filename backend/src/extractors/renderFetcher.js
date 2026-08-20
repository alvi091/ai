/*
 * Render fetcher — headless-browser rendering for client-side JS storefronts
 * (Flipkart, Myntra, Meesho, Noon, Namshi, Carrefour UAE, Sharaf DG, DubaiStore).
 *
 * Unlike the plain-HTTP `httpGet`, these stores serve an empty app shell that
 * only becomes a product page after their JavaScript runs, so we render them in
 * a single reused Chromium instance. Launching a fresh browser per request is a
 * memory killer, so a module-level singleton is reused across requests.
 *
 * Failures are graceful: any error returns `{ ok:false, error }` so the caller
 * can fall back to the honest "store blocked" path rather than analyzing air.
 */

const config = require('../config');

let browserPromise = null;

// Chrome-like metdata headers. Ajio (Akamai) blocks renders that omit the
// sec-ch-* markers and a full Accept header, so they are sent on every render.
const BROWSER_HEADERS = {
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'accept-language': 'en-IN,en-GB;q=0.9,en;q=0.8,en-US;q=0.7',
  'sec-ch-ua': '"Chromium";v="125", "Not.A/Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
};

function acquireBrowser() {
  if (browserPromise) return browserPromise;
  browserPromise = (async () => {
    const pw = require('playwright');
    const browser = await pw.chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
    return browser;
  })();
  return browserPromise;
}

/**
 * Render a single URL in a headless browser and return the final HTML.
 * Akamai edge blocks are often transient (a burst of requests trips a short
 * rolling block), so a block page triggers a couple of spaced retries with a
 * fresh context before giving up.
 * @param {string} url
 * @param {object} opts  { renderWait, timeoutMs, retries, retryDelayMs }
 */
async function renderPage(url, opts = {}) {
  const timeoutMs = opts.timeoutMs || 20000;
  const renderWait = opts.renderWait || null;
  const retries = opts.retries != null ? opts.retries : 2;
  const retryDelayMs = opts.retryDelayMs != null ? opts.retryDelayMs : 6000;

  let last = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(retryDelayMs * attempt);
    const res = await renderOnce(url, { timeoutMs, renderWait });
    last = res;
    if (!res.ok) continue;
    const lower = String(res.html || '').slice(0, 2000).toLowerCase();
    const isBlock = lower.includes('access denied') || lower.includes('forbidden') || lower.includes('unusual traffic');
    if (!isBlock) return res;
    // transient block page — retry
  }
  return last || { ok: false, html: '', error: 'Could not render the product page (blocked or broken).', rendered: true };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function renderOnce(url, { timeoutMs, renderWait }) {
  let browser;
  let context;
  try {
    browser = await acquireBrowser();
    context = await browser.newContext({
      userAgent: config.crawler.userAgent,
      viewport: { width: 1440, height: 2200 },
      locale: 'en-AE',
      extraHTTPHeaders: BROWSER_HEADERS,
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    if (renderWait) {
      try {
        await page.waitForSelector(renderWait, { timeout: 8000 });
      } catch { /* proceed with whatever rendered */ }
    }
    // Give late-bound React/Next hydration a moment.
    await page.waitForTimeout(1200);
    const html = await page.content();
    const finalUrl = page.url();
    return { ok: Boolean(html && html.length > 200), html: html || '', url: finalUrl, rendered: true };
  } catch (err) {
    return { ok: false, html: '', error: err.message, rendered: true };
  } finally {
    if (context) { try { await context.close(); } catch { /* ignore */ } }
  }
}

module.exports = { renderPage, acquireBrowser };
