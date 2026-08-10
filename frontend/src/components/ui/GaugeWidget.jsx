import { motion } from 'framer-motion';

export default function GaugeWidget({ value = 0, label = '', color = '#14b8a6', size = 'md' }) {
  const dim = size === 'lg' ? 160 : size === 'sm' ? 80 : 120;
  const strokeW = size === 'sm' ? 6 : 8;
  const radius = (dim - strokeW) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, value));
  const offset = circumference - (clamped / 100) * circumference;

  const bgColor = value >= 80 ? '#22c55e' : value >= 60 ? '#14b8a6' : value >= 40 ? '#eab308' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} className="-rotate-90">
          <circle cx={dim / 2} cy={dim / 2} r={radius} fill="none" stroke="#262656" strokeWidth={strokeW} />
          <motion.circle
            cx={dim / 2} cy={dim / 2} r={radius} fill="none"
            stroke={color || bgColor} strokeWidth={strokeW} strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-xl font-bold tracking-tight"
            style={{ color: color || bgColor }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {clamped}%
          </motion.span>
        </div>
      </div>
      {label && <span className="text-xs font-medium text-surface-700">{label}</span>}
    </div>
  );
}
