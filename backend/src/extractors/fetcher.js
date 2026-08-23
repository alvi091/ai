/*
 * Fetcher — pulls the raw HTML for a URL.
 *
 * Strategy:
 *   1. Plain HTTP GET (follows redirects, UA, timeout) → best for static pages.
 *   2. If the response looks like a bot-wall, a login-wall, or is too small to be
 *      a real product page, optionally retry with a headless browser (Playwright)
 *      when it is installed + enabled. Falls back gracefully when it isn't.
 *
 * Returned document is the HTML string; downstream uses the final URL for
 * canonicalization and relative-image resolution.
 */

const config = require('../config');
const { renderPage } = require('./renderFetcher');

/**
 * Route-aware fetch: JS storefronts need a real browser render, everything else
 * (notably Amazon) uses the fast plain-HTTP path.
 */
async function fetchPageSmart(url, site = null) {
  const needsRender = site && site.renderWait;
  if (needsRender && config.crawler.playwrightEnabled !== false) {
    const rendered = await renderPage(url, { renderWait: site.renderWait, siteId: site.id || null });
    if (rendered.ok && rendered.html.length >= config.crawler.minHtmlBytes) {
      return {
        ok: true,
        url: rendered.url || url,
        html: rendered.html,
        status: 200,
        contentType: 'text/html',
        rendered: true,
      };
    }
    // Playwright failed — fall through to plain HTTP instead of giving up.
    console.log(`[fetcher] Playwright failed for ${site.id || url}, trying plain HTTP`);
  }
  return fetchPage(url, site);
}

async function httpGet(url, opts = {}) {
  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs || config.crawler.timeoutMs;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': config.crawler.userAgent,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'accept-language': 'en-IN,en;q=0.9',
      },
    });
    const contentType = String(res.headers.get('content-type') || '');
    let html;
    try {
      html = await Promise.race([
        res.text(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timed out while reading response body')), timeoutMs)),
      ]);
    } catch (bodyErr) {
      return { ok: false, error: bodyErr.message, url, status: res.status, html: '', rendered: false };
    }
    return { ok: true, html, url: res.url, status: res.status, contentType, rendered: false };
  } catch (err) {
    return { ok: false, error: err.message, url, status: 0, html: '', rendered: false };
  } finally {
    clearTimeout(timer);
  }
}

let playwrightModule = null;
function loadPlaywright() {
  if (playwrightModule !== null) return playwrightModule;
  try {
    playwrightModule = require('playwright') || false;
  } catch {
    playwrightModule = false;
  }
  return playwrightModule;
}

function looksLikeBlocker(html, status) {
  if (status === 403 || status === 429 || status === 503) return true;
  const lower = String(html || '').toLowerCase().slice(0, 6000);
  return (
    (lower.includes('captcha') && lower.includes('robot')) ||
    lower.includes('access denied') ||
    lower.includes('verify you are human') ||
    lower.includes('unusual traffic') ||
    lower.includes('enable cookies') ||
    lower.includes('sorry, we just need to make sure') ||
    (lower.includes('automated') && lower.includes('bot')) ||
    lower.includes('server-side crawling')
  );
}

function isMyntraGeoBlock(html, url) {
  if (!/myntra\.com/i.test(url || '')) return false;
  const hasMyx = /window\.__myx\s*=/.test(String(html || ''));
  const lower = String(html || '').toLowerCase();
  const hasPdp = lower.includes('pdp-name') || lower.includes('pdp-title') || lower.includes('styleid');
  const hasPrice = lower.includes('pdp-price') || lower.includes('pdp-final-price');
  return !hasMyx && !hasPdp && !hasPrice;
}

async function renderWithPlaywright(url, opts = {}) {
  if (!loadPlaywright()) return { ok: false, html: '', error: 'playwright not installed', rendered: true };
  try {
    const { acquireBrowser } = require('./renderFetcher');
    const browser = await acquireBrowser();
    const context = await browser.newContext({
      userAgent: config.crawler.userAgent,
      viewport: { width: 1440, height: 2200 },
      locale: 'en-IN',
      timezoneId: 'Asia/Kolkata',
      extraHTTPHeaders: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'accept-language': 'en-IN,en-GB;q=0.9,en;q=0.8,en-US;q=0.7',
        'sec-ch-ua': '"Chromium";v="125", "Not.A/Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
      },
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: opts.timeoutMs || 12000 });
    await page.waitForTimeout(1500);
    const html = await page.content();
    const finalUrl = page.url();
    await context.close().catch(() => {});
    return { ok: Boolean(html && html.length > 200), html: html || '', url: finalUrl, rendered: true };
  } catch (err) {
    if (err && (err.message || '').match(/browser|target|crashed|detached|closed/i)) {
      const { resetBrowser } = require('./renderFetcher');
      if (resetBrowser) resetBrowser();
    }
    return { ok: false, html: '', error: err.message, rendered: true };
  }
}

async function fetchPage(url, site) {
  let first = await httpGet(url);

  if (!first.ok) {
    return first;
  }

  if (isMyntraGeoBlock(first.html, first.url || url)) {
    console.log(`[fetcher] Myntra geo-block detected (no product signals), skipping Playwright`);
    return { ok: false, error: 'Myntra blocked this request from our server location.', url, html: first.html, status: first.status, contentType: first.contentType, rendered: false, blocked: true };
  }

  const renderable =
    config.crawler.playwrightEnabled &&
    (looksLikeBlocker(first.html, first.status) || first.html.length < config.crawler.minHtmlBytes);

  if (renderable) {
    const rendered = await renderWithPlaywright(url);
    if (rendered.ok && rendered.html.length >= config.crawler.minHtmlBytes) {
      return {
        ok: true,
        url: rendered.url || first.url || url,
        html: rendered.html,
        status: first.status,
        contentType: first.contentType,
        rendered: true,
      };
    }
  }

  return first;
}

module.exports = { fetchPage, httpGet, looksLikeBlocker, isMyntraGeoBlock, renderWithPlaywright, fetchPageSmart };
