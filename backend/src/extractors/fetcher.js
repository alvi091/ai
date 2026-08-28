/*
 * Fetcher — pulls the raw HTML for a URL.
 *
 * Strategy:
 *   1. If Bright Data Web Unlocker is configured, use it as primary fetcher.
 *      It handles IP rotation, CAPTCHA solving, JS rendering, and retries.
 *   2. Otherwise, fall back to plain HTTP GET → Playwright render if blocked.
 *
 * Returned document is the HTML string; downstream uses the final URL for
 * canonicalization and relative-image resolution.
 */

const config = require('../config');
const { renderPage } = require('./renderFetcher');
const { fetchViaUnlocker } = require('../services/webUnlocker');

/**
 * Route-aware fetch: Web Unlocker first (if configured), then Playwright, then plain HTTP.
 */
async function fetchPageSmart(url, site = null) {
  // 1. Try Web Unlocker first — handles everything (IP rotation, CAPTCHA, JS rendering)
  if (config.webUnlocker?.enabled) {
    const unlockerResult = await fetchViaUnlocker(url);
    if (unlockerResult.ok && unlockerResult.html.length >= config.crawler.minHtmlBytes) {
      return {
        ok: true,
        url: unlockerResult.url || url,
        html: unlockerResult.html,
        status: 200,
        contentType: 'text/html',
        rendered: true,
        source: 'web-unlocker',
      };
    }
    console.log(`[fetcher] Web Unlocker failed for ${site?.id || url}: ${unlockerResult.error}, falling back`);
  }

  // 2. Fallback: existing Playwright / plain HTTP logic
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
        source: 'playwright',
      };
    }
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
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: opts.timeoutMs || 10000 });
    await page.waitForTimeout(800);
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
    // If Web Unlocker is available, try it as fallback for failed HTTP
    if (config.webUnlocker?.enabled) {
      const unlockerResult = await fetchViaUnlocker(url);
      if (unlockerResult.ok) {
        return { ok: true, url: unlockerResult.url || url, html: unlockerResult.html, status: 200, contentType: 'text/html', rendered: true, source: 'web-unlocker-fallback' };
      }
    }
    return first;
  }

  if (isMyntraGeoBlock(first.html, first.url || url)) {
    console.log(`[fetcher] Myntra geo-block detected (no product signals), skipping Playwright`);
    // Try Web Unlocker for Myntra geo-block
    if (config.webUnlocker?.enabled) {
      const unlockerResult = await fetchViaUnlocker(url);
      if (unlockerResult.ok && unlockerResult.html.length >= config.crawler.minHtmlBytes) {
        return { ok: true, url: unlockerResult.url || url, html: unlockerResult.html, status: 200, contentType: 'text/html', rendered: true, source: 'web-unlocker-myntra' };
      }
    }
    return { ok: false, error: 'Myntra blocked this request from our server location.', url, html: first.html, status: first.status, contentType: first.contentType, rendered: false, blocked: true };
  }

  const renderable =
    config.crawler.playwrightEnabled &&
    (looksLikeBlocker(first.html, first.status) || first.html.length < config.crawler.minHtmlBytes);

  if (renderable) {
    // Try Web Unlocker first for blocked pages
    if (config.webUnlocker?.enabled) {
      const unlockerResult = await fetchViaUnlocker(url);
      if (unlockerResult.ok && unlockerResult.html.length >= config.crawler.minHtmlBytes) {
        return { ok: true, url: unlockerResult.url || first.url || url, html: unlockerResult.html, status: 200, contentType: 'text/html', rendered: true, source: 'web-unlocker-blocked' };
      }
    }
    const rendered = await renderWithPlaywright(url);
    if (rendered.ok && rendered.html.length >= config.crawler.minHtmlBytes) {
      return {
        ok: true,
        url: rendered.url || first.url || url,
        html: rendered.html,
        status: first.status,
        contentType: first.contentType,
        rendered: true,
        source: 'playwright',
      };
    }
  }

  return first;
}

module.exports = { fetchPage, httpGet, looksLikeBlocker, isMyntraGeoBlock, renderWithPlaywright, fetchPageSmart };
