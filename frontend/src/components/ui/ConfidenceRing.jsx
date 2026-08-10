import { motion } from 'framer-motion';

const toneFor = (score) => {
  if (score >= 80) return '#22C55E';
  if (score >= 60) return '#14B8A6';
  if (score >= 40) return '#5EEAD4';
  return '#FACC15';
};

export default function ConfidenceRing({
  score = 0,
  size = 96,
  strokeWidth = 7,
  label = 'Confidence',
}) {
  const clamped = Math.min(100, Math.max(0, Number(score) || 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = toneFor(clamped);

  return (
    <div
      className="relative inline-flex flex-col items-center"
      style={{ width: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1E2127"
          strokeWidth={strokeWidth}
        />
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
          animate={{ strokeDashoffset: circumference * (1 - clamped / 100) }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="font-mono font-semibold leading-none"
          style={{ color, fontSize: size * 0.22 }}
        >
          {clamped}%
        </motion.span>
      </div>
      <span className="mt-2 text-[10px] font-mono uppercase tracking-widest text-mute">
        {label}
      </span>
    </div>
  );
}
