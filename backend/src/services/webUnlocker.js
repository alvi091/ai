/*
 * Web Unlocker service — wraps Bright Data's Web Unlocker API.
 *
 * Sends a URL to Bright Data, which handles:
 *   - IP rotation (400M+ residential IPs)
 *   - Browser fingerprinting
 *   - CAPTCHA solving (reCAPTCHA, hCaptcha, Cloudflare Turnstile)
 *   - JavaScript rendering (when needed)
 *   - Automatic retries with IP rotation
 *   - Anti-bot bypass (Akamai, DataDome, PerimeterX)
 *
 * Returns clean HTML. You only pay for successful requests.
 *
 * Usage:
 *   const { fetchViaUnlocker } = require('./webUnlocker');
 *   const result = await fetchViaUnlocker('https://www.flipkart.com/product-slug/p/itm...');
 *   if (result.ok) { /* use result.html *\/ }
 */

const config = require('../config');

const UNLOCKER_API = 'https://api.brightdata.com/request';
const DEFAULT_TIMEOUT = 45000;

/**
 * Fetch a URL via Bright Data Web Unlocker.
 * @param {string} url - Target URL
 * @param {object} opts - Options
 * @param {string} opts.zone - Bright Data zone (default: from config)
 * @param {string} opts.proxy - Proxy tier: 'residential:in', 'residential:us', etc.
 * @param {string} opts.mode - 'auto' (default), 'fast' (HTTP only), 'js_rendering' (always browser)
 * @param {boolean} opts.enableSolver - Enable CAPTCHA solving (default: true)
 * @param {number} opts.timeoutMs - Request timeout (default: 25000)
 * @param {string} opts.outputFormat - 'html' (default), 'json', 'markdown'
 * @param {string} opts.jsWaitSelector - Wait for this selector before capturing
 * @param {number} opts.jsWaitTimeout - Max wait for selector (ms)
 * @returns {Promise<{ok: boolean, html: string, url: string, status: number, error?: string}>}
 */
async function fetchViaUnlocker(url, opts = {}) {
  if (!config.webUnlocker?.key) {
    return { ok: false, html: '', url, status: 0, error: 'WEB_UNLOCKER_KEY not configured' };
  }

  const zone = opts.zone || config.webUnlocker.zone || 'unlocker1';
  const timeoutMs = opts.timeoutMs || DEFAULT_TIMEOUT;

  const body = {
    url,
    zone,
    format: 'raw',
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(UNLOCKER_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.webUnlocker.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      return { ok: false, html: '', url, status: res.status, error: `Unlocker ${res.status}: ${errBody.slice(0, 200)}` };
    }

    const contentType = res.headers.get('content-type') || '';
    let html;
    if (contentType.includes('json')) {
      const data = await res.json();
      html = data.data?.content || data.content || data.html || '';
    } else {
      html = await res.text();
    }

    return {
      ok: Boolean(html && html.length > 200),
      html,
      url,
      status: 200,
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { ok: false, html: '', url, status: 0, error: 'Unlocker timeout' };
    }
    return { ok: false, html: '', url, status: 0, error: `Unlocker error: ${err.message}` };
  }
}

/**
 * Fetch a URL via Web Unlocker, with retry on failure.
 * @param {string} url
 * @param {object} opts - Same as fetchViaUnlocker plus retries
 * @returns {Promise<{ok: boolean, html: string, url: string, status: number, error?: string}>}
 */
async function fetchViaUnlockerWithRetry(url, opts = {}) {
  const retries = opts.retries || 1;
  const retryDelayMs = opts.retryDelayMs || 2000;

  let last = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, retryDelayMs * attempt));
    }
    last = await fetchViaUnlocker(url, opts);
    if (last.ok) return last;
  }
  return last || { ok: false, html: '', url, status: 0, error: 'All retries failed' };
}

module.exports = { fetchViaUnlocker, fetchViaUnlockerWithRetry };
