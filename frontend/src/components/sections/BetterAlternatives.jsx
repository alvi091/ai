import { motion } from 'framer-motion';
import { ArrowRight, TrendingUp, DollarSign, Zap, Star, Sparkles } from 'lucide-react';

const CATEGORY_LABELS = {
  better_value: { label: 'Better Value', icon: DollarSign, color: 'text-emerald-400' },
  cheaper: { label: 'Cheaper', icon: TrendingUp, color: 'text-blue-400' },
  better_performance: { label: 'Better Performance', icon: Zap, color: 'text-purple-400' },
  similar: { label: 'Similar', icon: Star, color: 'text-amber-400' },
  premium: { label: 'Premium', icon: Sparkles, color: 'text-pink-400' },
};

export default function BetterAlternatives({ alternatives, existingAlternatives }) {
  const list = alternatives || existingAlternatives || [];

  if (list.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20">
          <ArrowRight className="h-5 w-5 text-violet-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Better Alternatives</h3>
          <p className="text-[13px] text-white/40">Other options worth considering</p>
        </div>
      </div>

      <div className="space-y-3">
        {list.slice(0, 5).map((alt, i) => {
          const catStyle = CATEGORY_LABELS[alt.category] || CATEGORY_LABELS.similar;
          const CatIcon = catStyle.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-white/80">{alt.name}</span>
                    <span className={`inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium ${catStyle.color}`}>
                      <CatIcon className="h-3 w-3" />
                      {catStyle.label}
                    </span>
                  </div>
                  {alt.brand && (
                    <p className="mt-1 text-[11px] text-white/30">{alt.brand}</p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-[12px]">
                    {alt.price && (
                      <span className="font-semibold text-white/70">₹{Math.round(alt.price).toLocaleString('en-IN')}</span>
                    )}
                    {alt.rating && (
                      <span className="text-white/40">{alt.rating}/5</span>
                    )}
                  </div>
                  {alt.advantage && (
                    <p className="mt-2 text-[12px] text-emerald-400/70">+ {alt.advantage}</p>
                  )}
                  {alt.disadvantage && (
                    <p className="mt-1 text-[12px] text-red-400/50">- {alt.disadvantage}</p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
