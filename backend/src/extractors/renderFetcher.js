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

function isGeoRedirectBlock(url, finalHtml, finalUrl, siteId) {
  if (!finalHtml) return false;
  if (!/myntra/i.test(siteId || url || '')) return false;
  const lower = String(finalHtml).toLowerCase();
  // If the URL kept its /buy/ path and we can find product signals, it's fine.
  const buyUrl = /\/buy(\/|$)/.test(url);
  const buyUrlKept = buyUrl && finalUrl && /\/buy(\/|$)/.test(finalUrl);
  // Positive product signals — if any of these are present the page is legit.
  const hasMyx = /window\.__myx\s*=/.test(finalHtml);
  const hasPdp = lower.includes('pdp-name') || lower.includes('pdp-title') || lower.includes('styleid');
  const hasPrice = lower.includes('pdp-price') || lower.includes('pdp-final-price');
  const hasProductShell = hasMyx || hasPdp || hasPrice;
  // If the URL kept /buy/ and has product content, never block.
  if (buyUrlKept && hasProductShell) return false;
  // If URL lost the /buy/ path entirely, that's a geo-redirect.
  if (buyUrl && !buyUrlKept) return true;
  // Only block Myntra if the page has no product shell at all.
  if (!hasProductShell) return true;
  return false;
}

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
  const retryDelayMs = opts.retryDelayMs != null ? opts.retryDelayMs : 3000;
  const siteId = opts.siteId || null;

  let last = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(retryDelayMs * attempt);
    const res = await renderOnce(url, { timeoutMs, renderWait, siteId, attempt });
    last = res;
    if (!res.ok) continue;
    const lower = String(res.html || '').slice(0, 4000).toLowerCase();
    const isBlock =
      lower.includes('access denied') ||
      lower.includes('forbidden') ||
      lower.includes('unusual traffic') ||
      lower.includes('captcha');
    if (isBlock) continue;
    if (isGeoRedirectBlock(url, res.html, res.url, siteId)) continue;
    return res;
  }
  return last || { ok: false, html: '', error: 'Could not render the product page (blocked or broken).', rendered: true };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function renderOnce(url, { timeoutMs, renderWait, siteId, attempt = 0 }) {
  let browser;
  let context;
  try {
    browser = await acquireBrowser();
    const needsIndia = /myntra|flipkart|ajio|nykaa|meesho/i.test(siteId || url || '');
    const locale = needsIndia ? 'en-IN' : 'en-IN';
    const timezoneId = needsIndia ? 'Asia/Kolkata' : 'Asia/Dubai';
    const perStoreHeaders = { ...BROWSER_HEADERS };
    if (/myntra/i.test(siteId || url || '')) {
      perStoreHeaders['Accept-Language'] = 'en-IN,en-GB;q=0.9,en;q=0.8';
      perStoreHeaders['sec-ch-ua'] = '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"';
      perStoreHeaders['sec-ch-ua-full-version-list'] = '"Google Chrome";v="125.0.6422.141", "Chromium";v="125.0.6422.141", "Not.A/Brand";v="24.0.0.0"';
      perStoreHeaders['sec-ch-ua-arch'] = '"x86"';
      perStoreHeaders['sec-ch-ua-bitness'] = '"64"';
      perStoreHeaders['sec-ch-ua-wow64'] = '?0';
      perStoreHeaders['sec-ch-ua-platform-version'] = '"15.0.0"';
      perStoreHeaders['sec-ch-ua-model'] = '';
      perStoreHeaders['sec-ch-ua-mobile'] = '?0';
      perStoreHeaders['sec-ch-ua-platform'] = '"Windows"';
    }
    context = await browser.newContext({
      userAgent: config.crawler.userAgent,
      viewport: { width: 1440, height: 2200 },
      locale,
      timezoneId,
      deviceScaleFactor: 1,
      colorScheme: 'light',
      hasTouch: false,
      isMobile: false,
      javaScriptEnabled: true,
      extraHTTPHeaders: perStoreHeaders,
    });
    try {
      await context.addCookies([
        { name: 'd', domain: '.myntra.com', path: '/', value: 'v_1_1_1_vt' },
        { name: 'lru_c', domain: '.myntra.com', path: '/', value: '1' },
        { name: 'UserPref', domain: '.myntra.com', path: '/', value: 't=IN&l=en' },
        { name: 'country', domain: '.myntra.com', path: '/', value: 'in' },
      ].filter((c) => /myntra/i.test(siteId || url || '') || /\.myntra\.com$/.test(c.domain)));
    } catch { /* ignore cookie errors */ }
    const page = await context.newPage();
    await page.route('**/*', async (route) => {
      const reqUrl = route.request().url();
      const resource = route.request().resourceType();
      if (resource === 'image' || resource === 'media' || resource === 'font' || resource === 'manifest') {
        if (attempt > 0 && Math.random() < 0.5) { return route.abort(); }
      }
      if (/(googletagmanager|doubleclick|hotjar|facebook|clevertap|firebase|analytics|newrelic|sentry\.io)/.test(reqUrl)) {
        return route.abort();
      }
      return route.continue();
    });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    if (renderWait) {
      try {
        await page.waitForSelector(renderWait, { timeout: 5000 });
      } catch { /* proceed with whatever rendered */ }
    }
    // Give late-bound React hydration a moment — a bit longer for geo-proxied
    // India storefronts so the window.__myx / __NEXT_DATA__ blob actually writes.
    await page.waitForTimeout(2200);
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
