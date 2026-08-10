export default function Chip({ children, active = false, onClick = null, className = '' }) {
  const base = 'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all duration-200';
  const styles = active
    ? 'border-primary-light/50 bg-primary/20 text-primary-light'
    : 'border-line bg-surface-elevated text-ink-secondary hover:border-line-strong hover:text-ink';
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag onClick={onClick} className={`${base} ${styles} ${className}`}>
      {children}
    </Tag>
  );
}
