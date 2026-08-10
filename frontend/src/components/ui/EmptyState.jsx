import { motion } from 'framer-motion';
import { fadeUp } from '../../lib/motion';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className={`flex flex-col items-center justify-center text-center py-20 px-6 ${className}`}
    >
      {Icon && (
        <span className="flex items-center justify-center w-16 h-16 rounded-3xl border border-surface-300 bg-surface-100 mb-6">
          <Icon className="w-7 h-7 text-surface-500" />
        </span>
      )}
      <h3 className="text-[20px] font-semibold text-white tracking-tight">{title}</h3>
      {description && <p className="mt-2 text-[14px] text-surface-500 max-w-md leading-relaxed">{description}</p>}
      {action && <div className="mt-7">{action}</div>}
    </motion.div>
  );
}
