export default function SectionHeading({ eyebrow, title, subtitle = '', align = 'left', className = '', action = null }) {
  const alignCls = align === 'center' ? 'text-center mx-auto' : 'text-left';
  return (
    <div className={`${alignCls} ${className}`}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className={`mt-3 text-3xl md:text-4xl font-semibold tracking-tight text-ink ${align === 'center' ? 'text-balance' : ''}`}>{title}</h2>
      {subtitle && <p className={`mt-4 text-[15px] md:text-base leading-relaxed text-ink-muted ${align === 'center' ? 'max-w-2xl' : 'max-w-xl'}`}>{subtitle}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
