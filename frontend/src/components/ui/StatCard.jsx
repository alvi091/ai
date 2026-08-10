import { motion } from 'framer-motion';
import AnimatedNumber from './AnimatedNumber';
import { fadeUp } from './motion';

export default function StatCard({ icon: Icon, label, value, suffix = '', prefix = '', decimals = 0, delay = 0, note }) {
  return (
    <motion.div
      variants={fadeUp}
      transition={{ delay }}
      className="tile p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-ink-400" strokeWidth={1.75} />}
      </div>
      <AnimatedNumber
        value={value}
        suffix={suffix}
        prefix={prefix}
        decimals={decimals}
        className="font-display text-[26px] font-semibold text-ink-100 tracking-tight"
      />
      {note && <p className="mt-1 text-[11px] text-ink-400">{note}</p>}
    </motion.div>
  );
}
