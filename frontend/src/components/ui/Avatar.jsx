import { useMemo } from 'react';

const TONES = [
  'bg-accent-600/20 text-accent-300 border-accent-600/30',
  'bg-success/15 text-success border-success/25',
  'bg-warning/15 text-warning border-warning/25',
  'bg-surface-200 text-ink-200 border-line',
];

export function Avatar({ name = 'User', size = 36, src }) {
  const tone = useMemo(() => TONES[name.length % TONES.length], [name]);
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="rounded-full object-cover border border-line"
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border font-semibold ${tone}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials || 'U'}
    </span>
  );
}
