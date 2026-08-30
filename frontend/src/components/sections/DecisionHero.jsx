import { motion } from 'framer-motion';
import { ShieldCheck, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';

const DECISION_STYLES = {
  BUY_NOW: { label: 'BUY', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', glow: 'shadow-emerald-500/20' },
  WAIT: { label: 'WAIT', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/25', glow: 'shadow-amber-500/20' },
  BUY_DURING_SALE: { label: 'WAIT FOR SALE', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/25', glow: 'shadow-blue-500/20' },
  GOOD_BUT_OVERPRICED: { label: 'WAIT', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/25', glow: 'shadow-amber-500/20' },
  BEST_IN_CATEGORY: { label: 'BUY', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', glow: 'shadow-emerald-500/20' },
  NOT_RECOMMENDED: { label: 'AVOID', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/25', glow: 'shadow-red-500/20' },
  EXCELLENT_LONG_TERM_VALUE: { label: 'BUY', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', glow: 'shadow-emerald-500/20' },
  BETTER_ALTERNATIVES: { label: 'AVOID', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/25', glow: 'shadow-red-500/20' },
  GREAT_ENTRY_LEVEL: { label: 'BUY', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', glow: 'shadow-emerald-500/20' },
  PREMIUM_CHOICE: { label: 'BUY', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', glow: 'shadow-emerald-500/20' },
  GOOD_FOR_SPECIFIC_USERS: { label: 'MAYBE', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/25', glow: 'shadow-blue-500/20' },
};

function getDecisionStyle(key) {
  return DECISION_STYLES[key] || DECISION_STYLES.WAIT;
}

export default function DecisionHero({ report, product }) {
  const verdict = report?.verdict;
  if (!verdict) return null;

  const style = getDecisionStyle(verdict.verdict || verdict.key);
  const confidence = verdict.confidence || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-transparent" />

      <div className="relative px-8 py-10 sm:px-12 sm:py-14">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className={`inline-flex items-center gap-3 rounded-2xl ${style.bg} ${style.border} border px-8 py-4 shadow-lg ${style.glow}`}
          >
            <span className={`font-display text-4xl sm:text-5xl font-bold tracking-tight ${style.color}`}>
              {style.label}
            </span>
          </motion.div>

          <div className="mt-6 flex items-center gap-3">
            <div className="relative h-3 w-32 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className={`h-full rounded-full ${confidence >= 70 ? 'bg-emerald-400' : confidence >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                initial={{ width: 0 }}
                animate={{ width: `${confidence}%` }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
            <span className="text-sm font-medium text-white/60">{confidence}% confidence</span>
          </div>

          {verdict.rationale && (
            <p className="mt-5 max-w-2xl text-base sm:text-lg leading-relaxed text-white/70">
              {verdict.rationale}
            </p>
          )}
        </div>

        {verdict.factors && verdict.factors.length > 0 && (
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {verdict.factors.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  {f.direction === 'positive' ? (
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                  ) : f.direction === 'negative' ? (
                    <TrendingDown className="h-4 w-4 text-red-400" />
                  ) : (
                    <Minus className="h-4 w-4 text-white/40" />
                  )}
                  <span className="text-sm font-medium text-white/90">{f.label}</span>
                </div>
                {f.detail && (
                  <p className="text-[13px] leading-relaxed text-white/50">{f.detail}</p>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {product?.contentMismatch && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-[13px] text-amber-300/80">{product.contentMismatch}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
