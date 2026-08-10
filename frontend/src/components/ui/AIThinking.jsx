import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Brain } from 'lucide-react';

export default function AIThinking({
  steps = [],
  onComplete,
  className = '',
  stepMs = 640,
}) {
  const [active, setActive] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (active >= steps.length) {
      setDone(true);
      const t = setTimeout(() => onComplete?.(), 480);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setActive((a) => a + 1), stepMs);
    return () => clearTimeout(t);
  }, [active, steps.length, stepMs, onComplete]);

  const progress = Math.min(100, Math.round((active / Math.max(steps.length, 1)) * 100));
  const confidence = Math.min(96, 34 + active * 13);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card overflow-hidden p-7 ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-700/15 ring-1 ring-inset ring-primary-500/25">
          <Brain className="h-5 w-5 text-primary-400" strokeWidth={1.75} />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulseDot rounded-full bg-primary-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-heading">Reasoning over your request</p>
          <p className="text-xs text-mute">
            {done ? 'Analysis complete' : `Step ${Math.min(active + 1, steps.length)} of ${steps.length}`}
          </p>
        </div>
        <span className="ml-auto font-mono text-sm font-semibold text-primary-400">
          {progress}%
        </span>
      </div>

      {/* scan line */}
      <div className="relative mt-6 h-px overflow-hidden bg-line">
        <div className="absolute inset-y-0 w-1/3 animate-scan bg-gradient-to-r from-transparent via-primary-400/60 to-transparent" />
      </div>

      <div className="mt-6 space-y-3">
        {steps.map((step, i) => {
          const state = i < active ? 'done' : i === active ? 'active' : 'pending';
          return (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.max(0, (i - active)) * 0.05 }}
              className="flex items-center gap-3"
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
                  state === 'done'
                    ? 'border-primary-500/60 bg-primary-700/25 text-primary-300'
                    : state === 'active'
                    ? 'border-primary-500 bg-primary-500/15'
                    : 'border-line bg-elevated'
                }`}
              >
                {state === 'done' ? (
                  <Check className="h-3.5 w-3.5" />
                ) : state === 'active' ? (
                  <span className="h-2 w-2 animate-pulseDot rounded-full bg-primary-400" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-line" />
                )}
              </span>
              <span
                className={`text-sm transition-colors duration-300 ${
                  state === 'done'
                    ? 'text-soft'
                    : state === 'active'
                    ? 'font-medium text-heading'
                    : 'text-mute'
                }`}
              >
                {step}
              </span>
              {state === 'active' && !done && (
                <span className="ml-auto flex gap-1">
                  {[0, 1, 2].map((d) => (
                    <span
                      key={d}
                      className="h-1 w-1 animate-bounce rounded-full bg-primary-400"
                      style={{ animationDelay: `${d * 0.15}s` }}
                    />
                  ))}
                </span>
              )}
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 rounded-2xl border border-primary-500/25 bg-primary-700/10 p-4"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono uppercase tracking-widest text-primary-300">
                Decision confidence
              </span>
              <span className="font-mono font-semibold text-primary-200">{confidence}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-elevated">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${confidence}%` }}
                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                className="h-full rounded-full bg-primary-500"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
