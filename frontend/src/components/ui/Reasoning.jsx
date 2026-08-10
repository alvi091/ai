import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';

const DEFAULT_STEPS = [
  { label: 'Parsing intent', detail: 'Extracting budget, use-case and constraints from your request' },
  { label: 'Scanning signals', detail: 'Analyzing thousands of products across marketplaces' },
  { label: 'Evaluating evidence', detail: 'Reviews, price history, brand trust, durability, fit' },
  { label: 'Ranking matches', detail: 'Scoring every candidate against your specific needs' },
];

export default function Reasoning({
  query,
  steps = DEFAULT_STEPS,
  stepDuration = 950,
  onComplete,
  compact = false,
}) {
  const [active, setActive] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setActive(0);
    setDone(false);
    let cancelled = false;
    steps.forEach((_, i) => {
      const t = setTimeout(() => {
        if (cancelled) return;
        setActive(i + 1);
        if (i === steps.length - 1) {
          setDone(true);
          setTimeout(() => onComplete?.(), 500);
        }
      }, stepDuration * (i + 1));
    });
    return () => {
      cancelled = true;
      steps.forEach((_, i) => clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const progress = Math.min(100, ((active + 1) / (steps.length + 1)) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-6"
    >
      <div className="flex items-start gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-surface-200 border border-line flex items-center justify-center shrink-0">
          <span className="font-display text-sm font-semibold text-ink-300">AI</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-400 mb-1">
            Thinking for you
          </p>
          <p className={`text-ink-100 leading-snug ${compact ? 'text-sm' : 'text-[15px]'} line-clamp-2`}>{query}</p>
        </div>
      </div>

      <div className="space-y-1">
        {steps.map((step, i) => {
          const state = i < active ? 'done' : i === active ? 'active' : 'pending';
          return (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5"
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300 ${
                  state === 'done'
                    ? 'bg-accent-600 border-accent-600 text-white'
                    : state === 'active'
                      ? 'border-accent-500/50 text-accent-400'
                      : 'border-line text-ink-400'
                }`}
              >
                {state === 'done' ? (
                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                ) : state === 'active' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span className="w-1 h-1 rounded-full bg-ink-400" />
                )}
              </div>
              <div className="min-w-0">
                <p
                  className={`text-sm font-medium transition-colors duration-300 ${
                    state === 'pending' ? 'text-ink-400' : 'text-ink-100'
                  }`}
                >
                  {step.label}
                </p>
                <AnimatePresence>
                  {state !== 'pending' && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-[11px] text-ink-400 overflow-hidden"
                    >
                      {step.detail}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-5">
        <div className="h-1 rounded-full bg-surface-200 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-accent-700 to-accent-500"
            animate={{ width: `${done ? 100 : progress}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
        <p className="mt-2 text-[11px] text-ink-400 text-right">
          {done ? 'Analysis complete' : `Reasoning in progress · ${Math.round(progress)}%`}
        </p>
      </div>
    </motion.div>
  );
}
