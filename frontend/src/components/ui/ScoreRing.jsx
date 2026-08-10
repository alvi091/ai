import { motion } from 'framer-motion';

export default function ScoreRing({
  score = 0,
  size = 112,
  strokeWidth = 8,
  color = '#14B8A6',
  trackColor = '#1A1C21',
  label = '',
  value = null,
  children = null,
  className = '',
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, Number(score) || 0));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children || (
          <>
            <span className="text-2xl font-semibold tracking-tight text-ink" style={{ color }}>
              {value ?? clamped}
            </span>
            {label && <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted">{label}</span>}
          </>
        )}
      </div>
    </div>
  );
}
