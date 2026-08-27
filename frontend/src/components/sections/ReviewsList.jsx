import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquareText, ThumbsUp, Star, ChevronDown, ChevronUp, Filter } from 'lucide-react';

const STAR_COLORS = {
  5: 'text-emerald-400', 4: 'text-emerald-400', 3: 'text-amber-400',
  2: 'text-red-400', 1: 'text-red-400',
};

export default function ReviewsList({ reviews }) {
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(false);

  if (!reviews || !Array.isArray(reviews) || reviews.length === 0) return null;

  const filtered = filter === 'all' ? reviews
    : filter === 'positive' ? reviews.filter((r) => (r.rating || 0) >= 4)
    : filter === 'negative' ? reviews.filter((r) => (r.rating || 0) <= 2)
    : reviews;

  const shown = expanded ? filtered : filtered.slice(0, 6);

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
            <MessageSquareText className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Buyer Reviews</h3>
            <p className="text-[13px] text-white/40">{reviews.length} reviews from Flipkart</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {['all', 'positive', 'negative'].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
                filter === f
                  ? 'bg-white/10 text-white/90'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              }`}>
              {f === 'all' ? 'All' : f === 'positive' ? 'Positive' : 'Negative'}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        <AnimatePresence mode="popLayout">
          {shown.map((r, i) => (
            <motion.div
              key={r.id || i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[13px] font-medium text-white/80">{r.author || 'Buyer'}</span>
                    {r.verified && (
                      <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400">
                        Verified
                      </span>
                    )}
                    <span className={`text-[12px] font-bold ${STAR_COLORS[r.rating] || 'text-white/50'}`}>
                      {'★'.repeat(Math.min(r.rating || 0, 5))}{'☆'.repeat(Math.max(0, 5 - (r.rating || 0)))}
                    </span>
                  </div>
                  {r.title && (
                    <p className="text-[13px] font-medium text-white/70 mb-1">{r.title}</p>
                  )}
                  <p className="text-[12px] leading-relaxed text-white/50 line-clamp-3">{r.text}</p>
                </div>
              </div>
              {r.date && (
                <p className="mt-2 text-[11px] text-white/25">{r.date}</p>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filtered.length > 6 && (
        <button onClick={() => setExpanded(!expanded)}
          className="mt-4 flex items-center gap-1.5 mx-auto text-[13px] text-white/40 hover:text-white/60 transition-colors">
          {expanded ? (
            <>Show less <ChevronUp className="h-3.5 w-3.5" /></>
          ) : (
            <>Show all {filtered.length} reviews <ChevronDown className="h-3.5 w-3.5" /></>
          )}
        </button>
      )}
    </div>
  );
}
