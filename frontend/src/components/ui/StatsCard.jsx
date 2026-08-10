import { motion } from 'framer-motion';
import { fadeUp } from '../../lib/motion';
import AnimatedCounter from './AnimatedCounter';

const ACCENTS = {
  teal: 'text-primary-400',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  neutral: 'text-surface-600',
};

export default function StatsCard({
  icon: Icon,
  label,
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  format,
  accent = 'teal',
  sub,
  index = 0,
  delay = 0,
}) {
  return (
    <motion.div
      variants={fadeUp}
      custom={delay}
      transition={{ delay: index * 0.04 }}
      className="card card-pad"
    >
      <div className="flex items-center gap-3">
        <span className={`flex items-center justify-center w-10 h-10 rounded-2xl bg-surface-200 border border-surface-300 ${ACCENTS[accent] || ACCENTS.teal}`}>
          {Icon && <Icon className="w-5 h-5" />}
        </span>
        <p className="text-[13px] text-surface-500 font-medium">{label}</p>
      </div>
      <div className="mt-4">
        <AnimatedCounter
          value={value}
          prefix={prefix}
          suffix={suffix}
          decimals={decimals}
          format={format}
          className="text-[30px] font-semibold tracking-tight text-white"
        />
        {sub && <p className="mt-1 text-[12px] text-surface-500">{sub}</p>}
      </div>
    </motion.div>
  );
}
