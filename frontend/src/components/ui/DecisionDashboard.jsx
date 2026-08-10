import { motion } from 'framer-motion';
import { Sparkles, ThumbsUp } from 'lucide-react';
import ScoreRing from './ScoreRing';
import DecisionBadge, { decisionMeta } from './DecisionBadge';
import { formatPrice } from '../../utils/format';

export default function DecisionDashboard({ decision }) {
  if (!decision) return null;
  const { product, suitability, priceFairness, buyDecision, buyerRegret, happiness, matchScore } = decision;

  const rings = [];
  if (suitability?.score != null) rings.push({ score: suitability.score, color: '#14B8A6', label: 'Match' });
  if (matchScore?.score != null) rings.push({ score: matchScore.score, color: '#14B8A6', label: 'Match' });
  if (buyDecision?.confidence != null) rings.push({ score: buyDecision.confidence, color: '#22C55E', label: 'Confidence' });
  if (happiness?.score != null) rings.push({ score: happiness.score, color: '#A1A7B3', label: 'Happiness' });
  if (buyerRegret?.regretProbability != null) rings.push({ score: buyerRegret.regretProbability, color: '#EF4444', label: 'Regret risk' });

  const priceStats = [
    { label: 'Fair price', value: priceFairness?.fairPrice, cls: 'text-ink' },
    { label: 'Lowest ever', value: priceFairness?.lowestEver, cls: 'text-success' },
    { label: 'Highest ever', value: priceFairness?.highestEver, cls: 'text-danger' },
  ];

  const verdict = buyDecision?.decision || decision?.aiReport?.verdict?.label;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card card-pad">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary-light" strokeWidth={1.75} />
          </div>
          <div>
            <p className="micro">AI verdict</p>
            <div className="mt-1.5">
              {buyDecision ? (
                <DecisionBadge decision={verdict} size="lg" confidence={buyDecision.confidence} />
              ) : (
                <span className="text-xl font-semibold text-ink">{verdict || 'Analyzing…'}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {rings.slice(0, 4).map((r) => (
            <ScoreRing key={r.label} score={r.score} size={72} strokeWidth={6} color={r.color} label={r.label} />
          ))}
        </div>
      </div>

      {priceStats.some((s) => s.value != null) && (
        <div className="mt-6 grid grid-cols-3 gap-3 border-t border-line/60 pt-6">
          {priceStats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-line/60 bg-surface-elevated/50 px-2 sm:px-4 py-3 text-center">
              <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.1em] text-ink-muted">{s.label}</p>
              <p className={`mt-1 text-[13px] sm:text-[15px] font-semibold truncate ${s.cls}`}>
                {s.value != null ? formatPrice(s.value, product?.currency) : '—'}
              </p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
