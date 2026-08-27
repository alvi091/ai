import { motion } from 'framer-motion';
import { Store, ArrowUpRight, Check } from 'lucide-react';

export default function MarketplaceComparison({ comparisons }) {
  if (!comparisons || !comparisons.comparisons || comparisons.comparisons.length === 0) return null;

  const { comparisons: list, bestPlace } = comparisons;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/20">
          <Store className="h-5 w-5 text-orange-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Marketplace Comparison</h3>
          <p className="text-[13px] text-white/40">Same product, different prices</p>
        </div>
      </div>

      <div className="space-y-3">
        {list.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`flex items-center justify-between rounded-xl border px-5 py-4 ${
              item.isSource
                ? 'border-teal-500/20 bg-teal-500/[0.04]'
                : item.price
                ? 'border-white/[0.06] bg-white/[0.02]'
                : 'border-white/[0.04] bg-white/[0.01] opacity-60'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-white/80">{item.marketplace}</span>
              {item.isSource && (
                <span className="rounded-full bg-teal-500/15 border border-teal-500/25 px-2 py-0.5 text-[10px] font-medium text-teal-400">
                  Source
                </span>
              )}
              {bestPlace === item.marketplace && !item.isSource && (
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-medium text-emerald-400 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Best Price
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                {item.price ? (
                  <span className="text-sm font-bold text-white">₹{Math.round(item.price).toLocaleString('en-IN')}</span>
                ) : (
                  <span className="text-[12px] text-white/30">{item.note || 'Data unavailable'}</span>
                )}
                {item.rating && (
                  <p className="text-[11px] text-white/40">{item.rating}/5 · {item.reviewCount || 0} reviews</p>
                )}
              </div>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/40 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <ArrowUpRight className="h-4 w-4" />
                </a>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {bestPlace && (
        <div className="mt-5 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] px-5 py-3">
          <p className="text-[13px] text-emerald-400/80">
            <span className="font-semibold">Best place to buy:</span> {bestPlace}
          </p>
        </div>
      )}
    </div>
  );
}
