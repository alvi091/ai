import { motion } from 'framer-motion';
import { Tag, TrendingDown, TrendingUp, Minus, CheckCircle2 } from 'lucide-react';

export default function PriceValue({ priceInsight, analytics }) {
  if (!priceInsight) return null;

  const fmt = (v) => {
    if (v == null) return null;
    return `₹${Math.round(v).toLocaleString('en-IN')}`;
  };

  const fairnessColor = {
    'Good Price': 'text-emerald-400',
    'Fair Price': 'text-amber-400',
    'Expensive': 'text-red-400',
  };

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
          <Tag className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Price & Value</h3>
          <p className="text-[13px] text-white/40">Is this a good deal?</p>
        </div>
      </div>

      <div className="flex items-baseline gap-3 mb-2">
        <span className="font-display text-3xl font-bold text-white">{fmt(priceInsight.current) || '—'}</span>
        {priceInsight.original && priceInsight.original > priceInsight.current && (
          <span className="text-lg text-white/30 line-through">{fmt(priceInsight.original)}</span>
        )}
        {priceInsight.discountPercent > 0 && (
          <span className="rounded-full bg-emerald-500/15 border border-emerald-500/25 px-3 py-1 text-[12px] font-semibold text-emerald-400">
            {priceInsight.discountPercent}% off
          </span>
        )}
      </div>

      {priceInsight.fairnessLabel && (
        <div className="mt-4 flex items-center gap-2">
          <span className={`text-sm font-semibold ${fairnessColor[priceInsight.fairnessLabel] || 'text-white/60'}`}>
            {priceInsight.fairnessLabel}
          </span>
          {priceInsight.fairnessScore != null && (
            <span className="text-[12px] text-white/40">({priceInsight.fairnessScore}/100)</span>
          )}
        </div>
      )}

      {priceInsight.bestTimeToBuy && (
        <p className="mt-3 text-[13px] leading-relaxed text-white/50">{priceInsight.bestTimeToBuy}</p>
      )}

      {priceInsight.savingsOpportunity > 0 && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="text-[13px] font-medium text-emerald-400">
            Save {fmt(priceInsight.savingsOpportunity)} if you wait
          </span>
        </div>
      )}

      {priceInsight.notes && priceInsight.notes.length > 0 && (
        <div className="mt-6 border-t border-white/[0.06] pt-5">
          <ul className="space-y-2">
            {priceInsight.notes.slice(0, 4).map((n, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-white/50">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/20" />
                {n}
              </li>
            ))}
          </ul>
        </div>
      )}

      {analytics?.worth && (
        <div className="mt-6 border-t border-white/[0.06] pt-5">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0">
              <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
                <circle cx="32" cy="32" r="26" fill="none" strokeWidth="5" className="stroke-white/10" />
                <motion.circle
                  cx="32" cy="32" r="26" fill="none" strokeWidth="5" strokeLinecap="round"
                  className="stroke-teal-400"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: (analytics.worth.score || 0) / 100 }}
                  transition={{ duration: 1, delay: 0.3 }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-mono text-sm font-bold text-white">{analytics.worth.score}</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-white/80">Worth Score</p>
              <p className="text-[12px] text-white/40">{analytics.worth.label || analytics.worth.tier}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
