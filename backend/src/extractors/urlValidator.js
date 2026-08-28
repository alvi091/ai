/*
 * URL validation & classification (Step 1 of the pipeline).
 *
 * Classifies an input as:
 *   - product URL      (a supported, product-shaped URL)
 *   - supported site, non-product page
 *   - unsupported website
 *   - malformed URL / not a URL
 *   - short URL         (bit.ly, amzn.to, ...) resolved to its final URL
 *   - canonical URL     (redirect chain resolved to the final destination)
 */

const config = require('../config');
const { detectSite, isProductUrl } = require('./websiteRegistry');

const SHORTENER_HOSTS = [
  'bit.ly', 'bitly.com', 't.co', 'tinyurl.com', 'goo.gl', 'amzn.to', 'amzn.in',
  'rebrand.ly', 'is.gd', 'buff.ly', 'ow.ly', 'cutt.ly', 'shorte.st', 'rb.gy',
  'lnk.to', 'amz.in', 'myntr.in', 'flpkrt', 'nike.link',
  'dl.flipkart.com',
];

const BLOCKED_HOSTS = [
  'youtube.com', 'youtu.be', 'google.com', 'google.co.in', 'bing.com', 'facebook.com',
  'instagram.com', 'x.com', 'twitter.com', 'linkedin.com', 'reddit.com', 'wikipedia.org',
];

function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function validateInput(raw) {
  const input = String(raw || '').trim();
  if (!input) {
    return { ok: false, status: 'empty', error: 'Please paste a product link to analyze.' };
  }
  // Heuristic: text blobs (more than ~8 words, or no domain-ish token) aren't URLs.
  if (input.split(/\s+/).length > 8 || !/\S+\.\S{2,}/.test(input)) {
    return { ok: false, status: 'not_a_url', error: 'That doesn\u2019t look like a product link. Paste the full product URL (e.g. https://www.amazon.in/dp/B0XXXXX).' };
  }
  // Fix common typos: ttps://, htpps://, httpss://, etc.
  let cleaned = input
    .replace(/^htpps?:\/\//i, 'https://')
    .replace(/^httpss?:\/\//i, 'https://')
    .replace(/^ttps:\/\//i, 'https://')
    .replace(/^tps:\/\//i, 'https://')
    .replace(/^ps:\/\//i, 'https://');
  const withScheme = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
  let parsed;
  try {
    parsed = new URL(withScheme);
  } catch {
    return { ok: false, status: 'malformed', error: 'Malformed URL \u2014 check the link and try again.' };
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { ok: false, status: 'malformed', error: 'Only http/https links can be analyzed.' };
  }
  return { ok: true, url: parsed.href, hostname: parsed.hostname.toLowerCase() };
}

function isShortUrl(url) {
  const host = hostOf(url);
  return SHORTENER_HOSTS.some((s) => host === s || host.endsWith(`.${s}`));
}

function isBlockedHost(url) {
  const host = hostOf(url);
  return BLOCKED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

async function resolveFinalUrl(url, depth = 0, timeoutMs = 12000) {
  if (depth > 3) return { ok: false, finalUrl: url, status: 0, error: 'Too many redirects.' };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'user-agent': config.crawler.userAgent,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    clearTimeout(timer);
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      const next = new URL(res.headers.get('location'), url).href;
      return resolveFinalUrl(next, depth + 1, timeoutMs);
    }
    return { ok: true, finalUrl: url, status: res.status };
  } catch {
    return { ok: false, finalUrl: url, status: 0, error: 'Unable to resolve link.' };
  }
}

/**
 * Main entry. Returns { ok, url, inputUrl, short, shortenedHost, resolved, site, isProduct, status, error }.
 */
async function validate(raw, { resolveShort = true } = {}) {
  const parsed = validateInput(raw);
  if (!parsed.ok) return { ...parsed, site: null, url: null };

  let url = parsed.url;
  const short = isShortUrl(url);
  const shortenedHost = short ? hostOf(url) : null;
  let resolved = false;

  if (short && resolveShort) {
    const r = await resolveFinalUrl(url);
    if (r.ok && r.finalUrl !== url) {
      url = r.finalUrl;
      resolved = true;
    }
  }

  if (isBlockedHost(url)) {
    return {
      ok: false,
      status: 'unsupported',
      url,
      inputUrl: parsed.url,
      short,
      shortenedHost,
      resolved,
      site: null,
      error: 'That website isn\u2019t a product store, so there is nothing to analyze.',
    };
  }

  const site = detectSite(url);
  if (!site.known) {
    const allowGeneric = config.analysis.allowGenericSites;
    return {
      ok: allowGeneric,
      status: allowGeneric ? 'generic' : 'unsupported',
      url,
      inputUrl: parsed.url,
      short,
      shortenedHost,
      resolved,
      site,
      isProduct: true,
      error: allowGeneric
        ? null
        : 'We don\u2019t recognize this website yet. We currently support Amazon, Flipkart, Myntra, Ajio, Nykaa, Apple, Samsung, Nike, Adidas, Croma, Reliance Digital and most other product pages.',
    };
  }

  const isProduct = isProductUrl(url);
  return { ok: true, status: 'product', url, inputUrl: parsed.url, short, shortenedHost, resolved, site, isProduct };
}

module.exports = { validate, isShortUrl, isBlockedHost, hostOf, validateInput };
