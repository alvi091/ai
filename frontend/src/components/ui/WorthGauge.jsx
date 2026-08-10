import { motion } from 'framer-motion';

export default function WorthGauge({ score = 0, size = 180, color = '#14B8A6', label = 'Worth Score', sublabel = '/100' }) {
  const clamped = Math.min(100, Math.max(0, Number(score) || 0));
  const angle = (clamped / 100) * 180; // 0 -> 180 deg
  const arcR = 78;
  const cx = 100;
  const cy = 100;

  const polar = (deg) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [cx + arcR * Math.cos(rad), cy + arcR * Math.sin(rad)];
  };

  const [sx, sy] = polar(0);
  const [ex, ey] = polar(angle);
  const largeArc = 0;

  const colorByScore = score >= 80 ? '#22C55E' : score >= 60 ? color : score >= 40 ? '#FACC15' : '#EF4444';

  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: size }}>
      <svg viewBox="0 0 200 120" style={{ width: size, height: size * 0.6 }} className="overflow-visible">
        {/* track */}
        <path
          d={`M ${sx} ${sy} A ${arcR} ${arcR} 0 ${largeArc} 1 ${polar(180)[0]} ${polar(180)[1]}`}
          fill="none"
          stroke="#1A1C21"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* value */}
        <motion.path
          d={`M ${sx} ${sy} A ${arcR} ${arcR} 0 ${largeArc} 1 ${ex} ${ey}`}
          fill="none"
          stroke={colorByScore}
          strokeWidth="14"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: clamped / 100 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        />
        {/* tick */}
        <motion.circle
          cx={ex}
          cy={ey}
          r="7"
          fill="#0A0A0B"
          stroke={colorByScore}
          strokeWidth="3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
        />
      </svg>
      <div className="absolute inset-x-0 top-1/2 -translate-y-[6%] flex flex-col items-center">
        <motion.span
          className="text-4xl font-semibold tracking-tight"
          style={{ color: colorByScore }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          {clamped}
          <span className="text-lg text-ink-muted">/100</span>
        </motion.span>
        <span className="mt-1 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">{label}</span>
      </div>
    </div>
  );
}
