import { motion } from 'framer-motion';
import { ThumbsUp, Clock3, CalendarClock, ThumbsDown, Sparkles } from 'lucide-react';

const VERDICTS = {
  BUY_NOW: { label: 'Buy Now', cls: 'verdict-buy', icon: ThumbsUp },
  buy_now: { label: 'Buy Now', cls: 'verdict-buy', icon: ThumbsUp },
  WAIT: { label: 'Wait', cls: 'verdict-wait', icon: Clock3 },
  wait: { label: 'Wait', cls: 'verdict-wait', icon: Clock3 },
  BUY_LATER: { label: 'Buy Later', cls: 'verdict-later', icon: CalendarClock },
  buy_later: { label: 'Buy Later', cls: 'verdict-later', icon: CalendarClock },
  NOT_RECOMMENDED: { label: 'Not Recommended', cls: 'verdict-avoid', icon: ThumbsDown },
  not_recommended: { label: 'Not Recommended', cls: 'verdict-avoid', icon: ThumbsDown },
};

export default function VerdictPill({ decision = 'wait', size = 'md', showIcon = true, pulse = false }) {
  const config = VERDICTS[decision] || VERDICTS.WAIT;
  const Icon = config.icon;
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`pill ${config.cls} ${size === 'lg' ? '!px-5 !py-2.5 text-sm' : ''}`}
    >
      {showIcon && <Icon className={size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />}
      {config.label}
    </motion.span>
  );
}

export function VerdictBadge({ label = '', color = 'accent', icon: Icon = Sparkles, className = '' }) {
  const tones = {
    buy: 'verdict-buy',
    success: 'verdict-buy',
    wait: 'verdict-wait',
    warning: 'verdict-wait',
    later: 'verdict-later',
    accent: 'verdict-later',
    avoid: 'verdict-avoid',
    danger: 'verdict-avoid',
  };
  return (
    <span className={`pill ${tones[color] || tones.accent} ${className}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}
