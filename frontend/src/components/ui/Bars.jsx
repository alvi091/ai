import { motion } from 'framer-motion';

export function HBar({ label, value, max = 100, color = '#14B8A6', sublabel }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-[12px] mb-1.5">
        <span className="text-ink-300 font-medium">{label}</span>
        <span className="text-ink-200 font-semibold">
          {sublabel || value}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-200 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

export function VBars({ items = [], height = 140 }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {items.map((item, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
          <motion.div
            className="w-full rounded-lg bg-accent-600/80"
            initial={{ height: 0 }}
            whileInView={{ height: `${Math.max(8, (item.value / max) * 100)}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: i * 0.06, ease: 'easeOut' }}
          />
          <span className="text-[10px] text-ink-400 truncate w-full text-center">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
