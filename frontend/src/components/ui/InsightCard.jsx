import { motion } from 'framer-motion';
import { fadeUp } from '../../lib/motion';

// Compact horizontal insight card.
export default function InsightCard({ icon: Icon, title, children, meta, className = '', accent = 'primary' }) {
  const accentClasses = {
    primary: 'bg-primary-600/12 text-primary-400 border-primary-600/20',
    success: 'bg-success/12 text-success border-success/20',
    warning: 'bg-warning/12 text-warning border-warning/20',
    danger: 'bg-danger/12 text-danger border-danger/20',
    neutral: 'bg-surface-200 text-surface-600 border-surface-300',
  };

  return (
    <motion.div variants={fadeUp} className={`card card-pad ${className}`}>
      <div className="flex items-start gap-4">
        {Icon && (
          <span className={`flex items-center justify-center w-11 h-11 rounded-2xl border shrink-0 ${accentClasses[accent] || accentClasses.primary}`}>
            <Icon className="w-5 h-5" />
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[15px] font-semibold text-white">{title}</h3>
            {meta && <span className="text-[12px] text-surface-500 shrink-0">{meta}</span>}
          </div>
          {children && <div className="mt-1.5 text-[14px] text-surface-600 leading-relaxed">{children}</div>}
        </div>
      </div>
    </motion.div>
  );
}
