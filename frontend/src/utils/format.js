export function formatPrice(value, currency) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  const c = String(currency || 'USD').toUpperCase();
  const sym = c === 'INR' ? '\u20B9' : '$';
  const locale = c === 'INR' ? 'en-IN' : 'en-US';
  const opts = { maximumFractionDigits: c === 'USD' ? 2 : 0 };
  if (c === 'USD' && !Number.isInteger(n)) opts.minimumFractionDigits = 2;
  return `${sym}${n.toLocaleString(locale, opts)}`;
}

export function formatCompact(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return `${Math.round(n)}`;
}

export function formatDate(date, opts = {}) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...opts,
  });
}

export function formatDateTime(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(date) {
  if (!date) return '';
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return formatDate(date);
}

// Clamp and round a numeric score to 0-100.
export function clampScore(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}
