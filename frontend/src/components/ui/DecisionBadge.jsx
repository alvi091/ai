import { motion } from 'framer-motion';
import { ThumbsUp, Clock, CalendarDays, ThumbsDown, AlertTriangle } from 'lucide-react';

const DECISIONS = {
  BUY_NOW: { label: 'Buy Now', tone: 'success', icon: ThumbsUp },
  WAIT: { label: 'Wait', tone: 'warning', icon: Clock },
  BUY_LATER: { label: 'Buy Later', tone: 'warning', icon: CalendarDays },
  NOT_RECOMMENDED: { label: 'Not Recommended', tone: 'danger', icon: ThumbsDown },
  buy_now: { label: 'Buy Now', tone: 'success', icon: ThumbsUp },
  wait: { label: 'Wait', tone: 'warning', icon: Clock },
  buy_later: { label: 'Buy Later', tone: 'warning', icon: CalendarDays },
  not_recommended: { label: 'Not Recommended', tone: 'danger', icon: ThumbsDown },
};

const TONES = {
  success: 'bg-success/12 text-success border-success/30',
  warning: 'bg-warning/12 text-warning border-warning/30',
  danger: 'bg-danger/12 text-danger border-danger/30',
};

export function decisionMeta(decision) {
  return DECISIONS[decision] || DECISIONS.WAIT;
}

export default function DecisionBadge({ decision = 'wait', size = 'md', confidence = null, showIcon = true }) {
  const config = decisionMeta(decision);
  const Icon = config.icon;
  const sizes = size === 'lg' ? 'px-6 py-2.5 text-base gap-2.5' : 'px-4 py-1.5 text-sm gap-1.5';

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className={`inline-flex items-center rounded-full border font-semibold ${TONES[config.tone]} ${sizes}`}
    >
      {showIcon && <Icon className={size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} />}
      {config.label}
      {confidence != null && <span className="opacity-70">· {confidence}%</span>}
    </motion.span>
  );
}
