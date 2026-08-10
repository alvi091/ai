import { motion } from 'framer-motion';
import { clampScore } from '../../utils/format';
import { EASE } from '../../lib/motion';

export function scoreColor(score) {
  const s = clampScore(score);
  if (s >= 80) return '#22C55E';
  if (s >= 60) return '#14B8A6';
  if (s >= 40) return '#FACC15';
  return '#EF4444';
}

export function scoreText(score) {
  const s = clampScore(score);
  if (s >= 80) return 'text-success';
  if (s >= 60) return 'text-primary-400';
  if (s >= 40) return 'text-warning';
  return 'text-danger';
}

// 270° arc gauge — the "worth score" meter.
export default function ScoreGauge({
  value = 0,
  label = '',
  caption = '',
  size = 220,
  strokeWidth = 14,
  color,
}) {
  const score = clampScore(value);
  const c = color || scoreColor(score);
  const cx = 100;
  const cy = 100;
  const r = 82;
  const start = (135 * Math.PI) / 180;
  const end = (45 * Math.PI) / 180;
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  const d = `M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x2} ${y2}`;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" width="100%" height="100%" style={{ transform: 'rotate(0deg)' }}>
        <path d={d} fill="none" stroke="#1A1C21" strokeWidth={strokeWidth} strokeLinecap="round" />
        <motion.path
          d={d}
          fill="none"
          stroke={c}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="100"
          initial={{ strokeDashoffset: 100 }}
          animate={{ strokeDashoffset: 100 - score }}
          transition={{ duration: 1.4, ease: EASE }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[13px] font-medium text-surface-500">{label}</span>
        <motion.span
          className="tnum text-[52px] font-semibold leading-none tracking-[-0.04em] text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          {score}
        </motion.span>
        {caption && <span className="mt-1 text-[11px] text-surface-500">{caption}</span>}
      </div>
    </div>
  );
}

// Full circular ring for confidence percentages.
export function ConfidenceRing({
  value = 0,
  label = '',
  size = 120,
  strokeWidth = 10,
  color,
  children,
}) {
  const score = clampScore(value);
  const c = color || scoreColor(score);
  const radius = 44;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width="100%" height="100%" className="-rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#1A1C21" strokeWidth={strokeWidth} />
        <motion.circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={c}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="100"
          initial={{ strokeDashoffset: 100 }}
          animate={{ strokeDashoffset: 100 - score }}
          transition={{ duration: 1.2, ease: EASE }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children || (
          <>
            <span className="tnum text-2xl font-semibold tracking-tight text-white">{score}%</span>
            {label && <span className="text-[10px] text-surface-500">{label}</span>}
          </>
        )}
      </div>
    </div>
  );
}

// Horizontal meter bar (risk / deal).
export function MeterBar({ value = 0, label = '', display, color, className = '' }) {
  const score = clampScore(value);
  const c = color || scoreColor(score);

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-surface-700">{label}</span>
          <span className="tnum text-[13px] font-semibold" style={{ color: c }}>
            {display ?? `${score}%`}
          </span>
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-surface-300 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: c }}
          initial={{ width: '0%' }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1.1, ease: EASE }}
        />
      </div>
    </div>
  );
}
