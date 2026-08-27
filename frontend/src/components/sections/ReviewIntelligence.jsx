import { motion } from 'framer-motion';
import { Star, ThumbsUp, ThumbsDown, ShieldCheck, MessageSquare } from 'lucide-react';

function generateSummary(analysis) {
  if (!analysis || analysis.total === 0) return null;
  const parts = [];
  const rating = analysis.avgRating;
  const total = analysis.total;
  const pos = analysis.positive;
  const neg = analysis.negative;

  if (rating >= 4.5) parts.push(`Buyers love this product — ${rating}/5 stars from ${total.toLocaleString()} reviews.`);
  else if (rating >= 4.0) parts.push(`Solid product with ${rating}/5 stars from ${total.toLocaleString()} reviews.`);
  else if (rating >= 3.5) parts.push(`Mixed reception — ${rating}/5 stars from ${total.toLocaleString()} reviews.`);
  else parts.push(`Below average — only ${rating}/5 stars from ${total.toLocaleString()} reviews.`);

  if (pos > 60) parts.push(`${pos}% of buyers rated it 4 stars or above, showing strong satisfaction.`);
  else if (pos > 40) parts.push(`${pos}% positive feedback — decent but not overwhelming.`);
  else if (pos < 25) parts.push(`Only ${pos}% positive — most buyers are not happy.`);

  if (neg > 30) parts.push(`However, ${neg}% gave 2 stars or below, which is a red flag worth considering.`);
  else if (neg > 15) parts.push(`${neg}% negative reviews — some buyers had issues that you should be aware of.`);
  else if (neg < 5) parts.push(`Very few complaints — almost no buyers regret this purchase.`);

  const praises = analysis.praises || [];
  const complaints = analysis.complaints || [];
  if (praises.length > 0) {
    const top = praises.slice(0, 2).map((p) => p.topic).join(' and ');
    parts.push(`Buyers especially praise the ${top}.`);
  }
  if (complaints.length > 0) {
    const top = complaints.slice(0, 2).map((c) => c.topic).join(' and ');
    parts.push(`Common complaints center around ${top}.`);
  }

  return parts.join(' ');
}

export default function ReviewIntelligence({ reviewAnalysis, sentiment }) {
  if (!reviewAnalysis) return null;

  const hasData = reviewAnalysis.total > 0;
  const summary = hasData ? generateSummary(reviewAnalysis) : null;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20">
          <Star className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Review Intelligence</h3>
          <p className="text-[13px] text-white/40">What buyers actually think</p>
        </div>
      </div>

      {!hasData && (
        <p className="text-sm text-white/40 py-4">No review data available for this product.</p>
      )}

      {hasData && (
        <>
          {/* Review Summary */}
          {summary && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-xl border border-purple-500/15 bg-purple-500/[0.03] px-5 py-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-purple-400" />
                <span className="text-[13px] font-semibold text-purple-400">Review Summary</span>
              </div>
              <p className="text-[13px] leading-relaxed text-white/60">{summary}</p>
            </motion.div>
          )}

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <StatCard
              label="Positive"
              value={reviewAnalysis.positive != null ? `${reviewAnalysis.positive}%` : '—'}
              color="text-emerald-400"
            />
            <StatCard
              label="Negative"
              value={reviewAnalysis.negative != null ? `${reviewAnalysis.negative}%` : '—'}
              color="text-red-400"
            />
            <StatCard
              label="Avg Rating"
              value={reviewAnalysis.avgRating != null ? reviewAnalysis.avgRating.toFixed(1) : '—'}
              color="text-amber-400"
            />
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-6 text-[12px]">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/50">
              {reviewAnalysis.total} reviews analyzed
            </span>
            {reviewAnalysis.confidence && (
              <span className={`rounded-full border px-3 py-1 ${
                reviewAnalysis.confidence >= 70
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                  : reviewAnalysis.confidence >= 40
                  ? 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                  : 'border-red-500/20 bg-red-500/10 text-red-400'
              }`}>
                {reviewAnalysis.confidence >= 70 ? 'High' : reviewAnalysis.confidence >= 40 ? 'Medium' : 'Low'} confidence
              </span>
            )}
            {reviewAnalysis.fakeRisk > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white/50">
                <ShieldCheck className="h-3 w-3" /> Fake risk {reviewAnalysis.fakeRisk}%
              </span>
            )}
          </div>

          {/* Star Distribution */}
          {reviewAnalysis.starDistribution && (
            <div className="mb-6 space-y-2">
              {[5, 4, 3, 2, 1].map((s) => {
                const pct = reviewAnalysis.starDistribution[`p${s}`];
                if (pct == null) return null;
                return (
                  <div key={s} className="flex items-center gap-3">
                    <span className="w-8 shrink-0 text-[12px] font-medium text-white/50">{s}★</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        className="h-full rounded-full bg-amber-400/80"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                        transition={{ duration: 0.7, delay: 0.2 }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right text-[12px] text-white/40">{pct}%</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Praises & Complaints */}
          {(reviewAnalysis.praises?.length > 0 || reviewAnalysis.complaints?.length > 0) && (
            <div className="grid gap-4 sm:grid-cols-2 mb-6">
              {reviewAnalysis.praises.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ThumbsUp className="h-4 w-4 text-emerald-400" />
                    <span className="text-[13px] font-semibold text-emerald-400">Buyers Like</span>
                  </div>
                  <ul className="space-y-2">
                    {reviewAnalysis.praises.map((p, i) => (
                      <li key={i} className="flex items-center gap-2 text-[13px] text-white/60">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                        {p.topic}
                        <span className="text-[11px] text-white/30">({p.weight}%)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {reviewAnalysis.complaints.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ThumbsDown className="h-4 w-4 text-red-400" />
                    <span className="text-[13px] font-semibold text-red-400">Buyers Complain About</span>
                  </div>
                  <ul className="space-y-2">
                    {reviewAnalysis.complaints.map((c, i) => (
                      <li key={i} className="flex items-center gap-2 text-[13px] text-white/60">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                        {c.topic}
                        <span className="text-[11px] text-white/30">({c.weight}%)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Buyer Quotes */}
          {reviewAnalysis.positiveQuotes?.length > 0 && (
            <div className="border-t border-white/[0.06] pt-5">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-white/30 mb-3">What Happy Buyers Say</p>
              <div className="space-y-2">
                {reviewAnalysis.positiveQuotes.slice(0, 3).map((q, i) => (
                  <QuoteCard key={i} quote={q} tone="emerald" />
                ))}
              </div>
            </div>
          )}

          {reviewAnalysis.negativeQuotes?.length > 0 && (
            <div className="mt-4">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-white/30 mb-3">Watch Out</p>
              <div className="space-y-2">
                {reviewAnalysis.negativeQuotes.slice(0, 3).map((q, i) => (
                  <QuoteCard key={i} quote={q} tone="red" />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
      <p className="text-[11px] uppercase tracking-wider text-white/30">{label}</p>
      <p className={`mt-1 font-display text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function QuoteCard({ quote, tone }) {
  const text = String(quote.text || quote.comment || '').slice(0, 200);
  const borderColor = tone === 'emerald' ? 'border-emerald-500/15 bg-emerald-500/[0.03]' : 'border-red-500/15 bg-red-500/[0.03]';
  return (
    <div className={`rounded-xl border ${borderColor} px-4 py-3`}>
      <p className="text-[13px] leading-relaxed text-white/60">&ldquo;{text}{text.length >= 200 ? '…' : ''}&rdquo;</p>
      <p className="mt-2 text-[11px] text-white/30">
        — {quote.author || 'buyer'}, {quote.rating}/5
      </p>
    </div>
  );
}
