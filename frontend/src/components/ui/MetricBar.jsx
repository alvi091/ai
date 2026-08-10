import { motion } from 'framer-motion';

export default function MetricBar({ label, value, max = 100, color = '#14B8A6', index = 0, right = null }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-ink-secondary">{label}</span>
        <span className="text-[13px] font-semibold text-ink">{right || `${Math.round(value)}`}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}
