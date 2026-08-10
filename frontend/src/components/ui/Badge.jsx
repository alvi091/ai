const TONES = {
  teal: 'badge-teal',
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  neutral: 'badge-neutral',
};

export default function Badge({ tone = 'neutral', icon: Icon, children, className = '', dot = false }) {
  return (
    <span className={`${TONES[tone] || TONES.neutral} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />}
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </span>
  );
}
