import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';

// Animated AI reasoning timeline used during search / decision generation.
export default function ReasoningCard({ steps = [], active = false, title = 'Reasoning', className = '' }) {
  const current = active ? steps.filter((s) => s.done).length : steps.length;
  const percent = steps.length ? Math.round((current / steps.length) * 100) : 0;

  return (
    <div className={`card card-pad ${className}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          {active && (
            <span className="relative flex w-2.5 h-2.5">
              <span className="absolute inline-flex w-full h-full rounded-full bg-primary-500 opacity-60 animate-ping" />
              <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-primary-500" />
            </span>
          )}
          <h3 className="text-[15px] font-semibold text-white">{title}</h3>
          <span className="tnum text-[12px] text-surface-500">{current}/{steps.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 rounded-full bg-surface-300 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary-500"
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <span className="tnum text-[12px] font-medium text-primary-400 w-8 text-right">{percent}%</span>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {steps.map((step, i) => {
          const done = active ? step.done : true;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: done ? 1 : 0.45, x: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className="flex items-start gap-3"
            >
              <span
                className={`mt-0.5 flex items-center justify-center w-5 h-5 rounded-full border shrink-0 transition-colors duration-300 ${
                  done
                    ? 'bg-primary-600/20 border-primary-500/50 text-primary-400'
                    : 'border-surface-400 text-surface-500'
                }`}
              >
                {done ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-surface-500 animate-pulse-dot" />
                )}
              </span>
              <div className="min-w-0">
                <p className={`text-[14px] ${done ? 'text-surface-800' : 'text-surface-500'}`}>{step.text}</p>
                {step.detail && (
                  <p className="mt-0.5 text-[12px] text-surface-500">{step.detail}</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// Minimal "thinking" loader with pulsing dots.
export function ThinkingDots({ label = 'Analyzing thousands of signals' }) {
  return (
    <div className="flex items-center gap-3 text-[14px] text-surface-500">
      <span className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse-dot"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </span>
      {label}
    </div>
  );
}

// Loader used for streaming AI content.
export function AIStreamLoader({ label = 'Generating analysis' }) {
  return (
    <div className="flex items-center gap-2.5 text-[13px] text-surface-500">
      <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
      {label}
      <AnimatePresence>
        <span className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1 h-1 rounded-full bg-primary-500"
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </span>
      </AnimatePresence>
    </div>
  );
}
