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
        'accept-language': 'en-US,en;q=0.9',
      },
    });
    const contentType = String(res.headers.get('content-type') || '');
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml') && !res.url.includes('/p/')) {
      // still allow download of html-ish content
    }
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
    lower.includes('sorry, we just need to make sure')
  );
}

async function renderWithPlaywright(url, opts = {}) {
  const pw = loadPlaywright();
  if (!pw) return { ok: false, html: '', error: 'playwright not installed', rendered: true };
  let browser;
  try {
    browser = await pw.chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    });
    const context = await browser.newContext({
      userAgent: config.crawler.userAgent,
      viewport: { width: 1440, height: 2200 },
      locale: 'en-IN',
      extraHTTPHeaders: { 'accept-language': 'en-US,en;q=0.9' },
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: opts.timeoutMs || 18000 });
    await page.waitForTimeout(1200);
    const html = await page.content();
    const finalUrl = page.url();
    await browser.close();
    return { ok: Boolean(html && html.length > 200), html: html || '', url: finalUrl, rendered: true };
  } catch (err) {
    if (browser) { try { await browser.close(); } catch { /* ignore */ } }
    return { ok: false, html: '', error: err.message, rendered: true };
  }
}

async function fetchPage(url) {
  let first = await httpGet(url);
  const renderable =
    config.crawler.playwrightEnabled &&
    (!first.ok || looksLikeBlocker(first.html, first.status) || first.html.length < config.crawler.minHtmlBytes);

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

  if (!first.ok) {
    return { ok: false, error: first.error || 'Failed to fetch the page', url, html: '', status: first.status, contentType: '', rendered: false };
  }
  return first;
}

module.exports = { fetchPage, httpGet, looksLikeBlocker, renderWithPlaywright };