import { motion } from 'framer-motion';

export default function AiTimeline({ items = [], accent = '#14B8A6', className = '' }) {
  if (!items.length) return null;
  return (
    <div className={`relative ${className}`}>
      <div className="absolute bottom-2 left-[15px] top-2 w-px bg-line/70" />
      <div className="space-y-1">
        {items.map((item, i) => {
          const Icon = item.icon;
          const Active = item.node;
          return (
            <motion.div
              key={item.id || i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.4 }}
              className="relative flex items-start gap-4"
            >
              <div className="relative z-10 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface-elevated">
                {Active ? (
                  <Active className="h-4 w-4 text-primary-light" strokeWidth={2} />
                ) : Icon ? (
                  <Icon className="h-4 w-4 text-ink-secondary" strokeWidth={1.75} />
                ) : (
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
                )}
              </div>
              <div className="flex-1 pb-5">
                {item.title && <p className="text-[15px] font-medium text-ink">{item.title}</p>}
                {item.subtitle && <p className="mt-0.5 text-[13px] text-ink-secondary">{item.subtitle}</p>}
                {item.meta && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">{item.meta}</div>
                )}
              </div>
              {item.trailing && <div className="shrink-0 pt-1">{item.trailing}</div>}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
