import { motion } from 'framer-motion';
import { Brain, ScanSearch, ListFilter, TrendingDown, Check } from 'lucide-react';
import { useState, useEffect } from 'react';

const STEPS = [
  { icon: Brain, label: 'Understanding your intent' },
  { icon: ListFilter, label: 'Extracting requirements' },
  { icon: ScanSearch, label: 'Scanning the marketplace' },
  { icon: TrendingDown, label: 'Analyzing price signals' },
  { icon: Check, label: 'Reasoning the decision' },
];

export default function ThinkingIndicator({ active = true }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setStep((s) => {
        if (s >= STEPS.length) return s;
        return s + 1;
      });
    }, 620);
    return () => clearInterval(id);
  }, [active]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card max-w-2xl p-6"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15">
          <Brain className="h-5 w-5 text-primary-light" strokeWidth={1.5} />
          <span className="absolute -right-1 -top-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-light opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-primary-light" />
          </span>
        </div>
        <div>
          <p className="text-[15px] font-semibold text-ink">Ayymus is reasoning</p>
          <p className="text-[13px] text-ink-muted">Analyzing signals, comparing options, weighing tradeoffs.</p>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < step;
          const current = i === step;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0.35 }}
              animate={{ opacity: current ? 1 : done ? 0.7 : 0.4 }}
              className="flex items-center gap-3"
            >
              <div className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors duration-300 ${
                done ? 'border-primary-light bg-primary/20' : current ? 'border-primary-light/60 bg-primary/10' : 'border-line'
              }`}>
                {done ? (
                  <Check className="h-3.5 w-3.5 text-primary-light" />
                ) : current ? (
                  <span className="h-2 w-2 rounded-full bg-primary-light animate-pulse-dot" />
                ) : (
                  <Icon className="h-3 w-3 text-ink-muted" />
                )}
              </div>
              <span className={`text-sm ${current ? 'text-ink' : 'text-ink-muted'}`}>{s.label}</span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
