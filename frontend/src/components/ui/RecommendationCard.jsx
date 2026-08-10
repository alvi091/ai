import { motion } from 'framer-motion';
import { ThumbsUp, ThumbsDown, Clock, CalendarClock, Sparkles, GitCompare, Award } from 'lucide-react';
import { fadeUp } from '../../lib/motion';
import { ConfidenceRing } from './Gauge';
import Badge from './Badge';

const VERDICT_STYLES = {
  buy: {
    tone: 'success',
    ring: 'text-success',
    icon: ThumbsUp,
    accent: 'border-l-success',
    chip: 'border-success/25 bg-success/12 text-success',
  },
  best: {
    tone: 'success',
    ring: 'text-success',
    icon: Award,
    accent: 'border-l-success',
    chip: 'border-success/25 bg-success/12 text-success',
  },
  wait: {
    tone: 'warning',
    ring: 'text-warning',
    icon: Clock,
    accent: 'border-l-warning',
    chip: 'border-warning/25 bg-warning/12 text-warning',
  },
  later: {
    tone: 'warning',
    ring: 'text-warning',
    icon: CalendarClock,
    accent: 'border-l-warning',
    chip: 'border-warning/25 bg-warning/12 text-warning',
  },
  alt: {
    tone: 'warning',
    ring: 'text-warning',
    icon: GitCompare,
    accent: 'border-l-warning',
    chip: 'border-warning/25 bg-warning/12 text-warning',
  },
  avoid: {
    tone: 'danger',
    ring: 'text-danger',
    icon: ThumbsDown,
    accent: 'border-l-danger',
    chip: 'border-danger/25 bg-danger/12 text-danger',
  },
};

// Normalize any verdict shape (aiReport verdict or buyDecision) into one object.
export function normalizeVerdict(v, fallback = {}) {
  const key = String(v?.verdict || v?.decision || '').toUpperCase();
  let style = 'wait';
  if (['BUY_NOW', 'BEST_IN_CATEGORY', 'EXCELLENT_LONG_TERM_VALUE', 'GREAT_ENTRY_LEVEL', 'PREMIUM_CHOICE'].includes(key)) style = key === 'BEST_IN_CATEGORY' ? 'best' : 'buy';
  else if (['BUY_DURING_SALE', 'WAIT', 'GOOD_FOR_SPECIFIC_USERS'].includes(key)) style = 'wait';
  else if (['GOOD_BUT_OVERPRICED', 'BETTER_ALTERNATIVES', 'BUY_LATER'].includes(key)) style = key === 'BETTER_ALTERNATIVES' ? 'alt' : 'later';
  else if (['NOT_RECOMMENDED', 'AVOID'].includes(key)) style = 'avoid';

  return {
    key,
    label: v?.label || fallback?.label || (style === 'avoid' ? 'Not Recommended' : style === 'buy' ? 'Buy Now' : 'Wait'),
    confidence: v?.confidence ?? v?.confidencePercentage ?? 50,
    rationale: v?.rationale || v?.explanation || '',
    factors: v?.factors || [],
    reasons: v?.reasons || [],
    style,
  };
}

export default function RecommendationCard({ verdict, title = 'AI Verdict', className = '' }) {
  const norm = normalizeVerdict(verdict);
  const style = VERDICT_STYLES[norm.style] || VERDICT_STYLES.wait;
  const Icon = style.icon;
  const hasFactors = Array.isArray(norm.factors) && norm.factors.length > 0;
  const hasReasons = Array.isArray(norm.reasons) && norm.reasons.length > 0;

  return (
    <motion.div
      variants={fadeUp}
      className={`card card-pad overflow-hidden border-l-[3px] ${style.accent} ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5">
            <span className={`flex items-center justify-center w-10 h-10 rounded-2xl border ${style.chip}`}>
              <Icon className="w-5 h-5" />
            </span>
            <div>
              <p className="text-[12px] text-surface-500 font-medium">{title}</p>
              <h3 className="text-[22px] font-semibold tracking-tight text-white">{norm.label}</h3>
            </div>
          </div>

          {norm.rationale && (
            <p className="mt-4 text-[14px] leading-relaxed text-surface-600">{norm.rationale}</p>
          )}

          {hasFactors && (
            <div className="mt-4 flex flex-wrap gap-2">
              {norm.factors.slice(0, 6).map((f, i) => (
                <span
                  key={i}
                  title={f.detail || ''}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-medium ${
                    f.direction === 'positive'
                      ? 'border-success/25 bg-success/12 text-success'
                      : f.direction === 'negative'
                        ? 'border-danger/25 bg-danger/12 text-danger'
                        : 'border-surface-300 bg-surface-200 text-surface-700'
                  }`}
                >
                  {f.label}
                </span>
              ))}
            </div>
          )}

          {hasReasons && !hasFactors && (
            <ul className="mt-4 space-y-1.5">
              {norm.reasons.slice(0, 4).map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-surface-600">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-primary-500 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <ConfidenceRing value={norm.confidence} label="confidence" size={116} />
          <div className="space-y-0.5 sm:hidden">
            <Badge tone={style.tone}>{norm.label}</Badge>
          </div>
        </div>
      </div>

      <div className="sr-only">
        <Sparkles className="w-4 h-4" />
        Decision confidence {norm.confidence}%
      </div>
    </motion.div>
  );
}
