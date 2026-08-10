import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  ChevronLeft,
  Sparkles,
  Share2,
  MessageCircleQuestion,
  ThumbsUp,
  ThumbsDown,
  Check,
  X,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Minus,
  ShieldCheck,
  UserCheck,
  UserX,
  Scale,
  Clock,
  Package,
  Star,
  CalendarDays,
  GitCompare,
  BrainCircuit,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { products, wishlist as wishlistApi, decision as decisionApi } from '../services/api';
import ProductCard from '../components/ui/ProductCard';
import SmartBundle from '../components/ui/SmartBundle';
import FollowUpQuestions from '../components/ui/FollowUpQuestions';
import ScoreGauge from '../components/ui/ScoreGauge';
import ConfidenceRing from '../components/ui/ConfidenceRing';
import PriceTrendChart from '../components/ui/PriceTrendChart';
import Skeleton from '../components/ui/Skeleton';
import GuestBanner from '../components/ui/GuestBanner';
import { formatPrice } from '../utils/format';

const VERDICT_TONE = {
  green: { color: '#22C55E', soft: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', label: 'Buy' },
  blue: { color: '#5EEAD4', soft: 'rgba(20,184,166,0.1)', border: 'rgba(20,184,166,0.3)', label: 'Consider' },
  yellow: { color: '#FACC15', soft: 'rgba(250,204,21,0.08)', border: 'rgba(250,204,21,0.28)', label: 'Watch' },
  orange: { color: '#FACC15', soft: 'rgba(250,204,21,0.08)', border: 'rgba(250,204,21,0.28)', label: 'Caution' },
  red: { color: '#EF4444', soft: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', label: 'Avoid' },
};

function SectionLabel({ index, children }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-primary-500/25 bg-primary-700/10 font-mono text-[11px] font-semibold text-primary-300">
        {index}
      </span>
      <h2 className="text-xl font-semibold tracking-tight text-heading">{children}</h2>
      <div className="hairline flex-1" />
    </div>
  );
}

function VerdictBanner({ report, buyDecision }) {
  const verdict = report?.verdict || buyDecision;
  if (!verdict) return null;

  const color = verdict.color || 'blue';
  const tone = VERDICT_TONE[color] || VERDICT_TONE.blue;
  const confidence = verdict.confidence ?? buyDecision?.confidence;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="card relative overflow-hidden p-7 sm:p-10"
    >
      <div
        className="absolute right-0 top-0 h-64 w-64 rounded-full blur-[110px]"
        style={{ background: tone.soft }}
      />
      <div className="relative flex flex-wrap items-start gap-8">
        <div className="flex w-full flex-col items-center sm:min-w-[220px] sm:w-auto">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-3xl"
            style={{ background: tone.soft, boxShadow: `inset 0 0 0 1px ${tone.border}` }}
          >
            {verdict.label?.toLowerCase().includes('not') ||
              verdict.label?.toLowerCase().includes('overpriced') ||
              color === 'red' ? (
              <ThumbsDown className="h-7 w-7" style={{ color: tone.color }} />
            ) : (
              <ThumbsUp className="h-7 w-7" style={{ color: tone.color }} />
            )}
          </div>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-mute">
            AI verdict
          </p>
          <p
            className="mt-1 text-center font-mono text-xl font-semibold tracking-tight"
            style={{ color: tone.color }}
          >
            {verdict.label}
          </p>
          {confidence != null && (
            <span className="mt-3 rounded-full border px-3 py-1 font-mono text-[11px] font-semibold"
              style={{ borderColor: tone.border, color: tone.color, background: tone.soft }}>
              {confidence}% confidence
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-relaxed text-body">{verdict.rationale}</p>

          {verdict.factors?.length > 0 && (
            <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {verdict.factors.map((f, i) => {
                const positive = f.direction === 'positive';
                const neutral = f.direction !== 'positive' && f.direction !== 'negative';
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-2xl border border-line bg-elevated/60 p-4"
                  >
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                      style={{
                        background: positive
                          ? 'rgba(34,197,94,0.12)'
                          : neutral
                            ? 'rgba(42,45,53,0.9)'
                            : 'rgba(239,68,68,0.12)',
                        color: positive ? '#22C55E' : neutral ? '#A1A7B3' : '#EF4444',
                      }}
                    >
                      {positive ? (
                        <Check className="h-3 w-3" />
                      ) : neutral ? (
                        <Minus className="h-3 w-3" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </span>
                    <div>
                      <p className="text-[13px] font-semibold text-heading">{f.label}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-mute">{f.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ScoreCluster({ decision }) {
  const { suitability, happiness, buyerRegret, buyDecision } = decision || {};
  const confidence = buyDecision?.confidence;

  return (
    <section>
      <SectionLabel index={1}>Decision signals</SectionLabel>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {suitability && (
          <div className="card card-hover flex flex-col items-center justify-center p-6 sm:p-7">
            <ScoreGauge score={suitability.score} label="Suitability" size={128} />
          </div>
        )}
        {happiness && (
          <div className="card card-hover flex flex-col items-center justify-center p-6 sm:p-7">
            <ScoreGauge score={happiness.score} label="Happiness" toneLabel={false} size={128} />
            <p className="mt-3 text-xs text-mute">{happiness.summary}</p>
          </div>
        )}
        {confidence != null && (
          <div className="card card-hover flex flex-col items-center justify-center p-6 sm:p-7">
            <ConfidenceRing score={confidence} size={128} label="Confidence" />
          </div>
        )}
        {buyerRegret && (
          <div className="card card-hover flex flex-col items-center justify-center p-6 sm:p-7">
            <div className="flex flex-col items-center">
              <div className="relative flex items-center justify-center" style={{ width: 128, height: 128 }}>
                <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
                  <circle cx="64" cy="64" r="56" fill="none" stroke="#1E2127" strokeWidth="9" />
                  <motion.circle
                    cx="64" cy="64" r="56" fill="none"
                    stroke={buyerRegret.regretProbability <= 25 ? '#22C55E' : buyerRegret.regretProbability <= 45 ? '#14B8A6' : '#EF4444'}
                    strokeWidth="9" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 56}
                    initial={{ strokeDashoffset: 2 * Math.PI * 56 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 56 * (1 - buyerRegret.regretProbability / 100) }}
                    transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono text-2xl font-semibold text-heading">
                    {buyerRegret.regretProbability}%
                  </span>
                </div>
              </div>
              <span className="mt-2 font-mono text-[10px] uppercase tracking-widest text-mute">
                Regret risk
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function PriceIntelligence({ decision, currency }) {
  const pf = decision?.priceFairness;
  if (!pf) return null;

  const history = pf.priceHistory || [];
  const chartData = history.map((p) => ({
    date: typeof p.date === 'string' ? p.date.slice(0, 10) : p.date,
    price: p.price,
  }));

  const trend = pf.expectedTrend || 'stable';
  const TrendIcon = trend === 'down' || trend === 'falling' ? TrendingDown : trend === 'up' || trend === 'rising' ? TrendingUp : Minus;
  const trendTone = trend === 'down' || trend === 'falling' ? '#22C55E' : trend === 'up' || trend === 'rising' ? '#EF4444' : '#A1A7B3';

  return (
    <section>
      <SectionLabel index={2}>Price intelligence</SectionLabel>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card p-7 lg:col-span-2">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-[17px] font-semibold text-heading">Price history</h3>
              <p className="mt-1 text-xs text-mute">Last 45 days · updated continuously</p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-line bg-elevated px-4 py-2">
              <TrendIcon className="h-4 w-4" style={{ color: trendTone }} />
              <span className="font-mono text-[11px] uppercase tracking-widest" style={{ color: trendTone }}>
                Trend: {trend}
              </span>
            </div>
          </div>
          {chartData.length >= 2 ? (
            <PriceTrendChart data={chartData} currency={currency} currentPrice={pf.currentPrice ?? decision?.product?.price} />
          ) : (
            <div className="flex h-[220px] items-center justify-center rounded-2xl border border-dashed border-line">
              <p className="text-sm text-mute">Insufficient price history</p>
            </div>
          )}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              ['Fair price', pf.fairPrice],
              ['Lowest ever', pf.lowestEver],
              ['Highest ever', pf.highestEver],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-line bg-elevated/50 p-4 text-center">
                <p className="font-mono text-[10px] uppercase tracking-widest text-mute">{label}</p>
                <p className="mt-1.5 font-mono text-base font-semibold text-heading">
                  {formatPrice(value ?? decision?.product?.price, currency)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          {pf.verdict && (
            <div className="card flex-1 p-7">
              <div className="mb-3 flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary-400" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-mute">Deal status</span>
              </div>
              <p className="text-lg font-semibold text-heading">{pf.verdict}</p>
              {pf.fairnessScore != null && (
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-mute">Fairness</span>
                    <span className="font-mono font-semibold text-primary-300">{pf.fairnessScore}/100</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-elevated">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pf.fairnessScore}%` }}
                      transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full rounded-full bg-primary-500"
                    />
                  </div>
                </div>
              )}
              {pf.discountPercent > 0 && (
                <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1 font-mono text-[11px] font-semibold text-success">
                  <TrendingDown className="h-3 w-3" /> {pf.discountPercent}% off now
                </p>
              )}
            </div>
          )}
          <div className="card flex-1 p-7">
            <div className="mb-3 flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-primary-400" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-mute">Timing signal</span>
            </div>
            <p className="text-sm leading-relaxed text-body">
              {pf.expectedTrend === 'down'
                ? 'The price has been falling. Waiting a few days may capture a lower point — but review sentiment and stock matter more.'
                : pf.expectedTrend === 'up'
                  ? 'The price is trending upward. If this product fits, buying sooner rather than later is usually wise.'
                  : 'The price is stable with no strong directional signal. Timing is a neutral factor here.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function DecisionBreakdown({ decision }) {
  const explanation = decision?.decisionExplanation;
  const whyNot = decision?.whyNotBuy;
  const cards = [];

  if (explanation?.whyThis?.length) {
    cards.push({
      icon: ThumbsUp,
      tone: '#22C55E',
      title: 'Why this one',
      items: explanation.whyThis.slice(0, 4),
      accent: true,
    });
  }
  if (explanation?.whyNotOthers?.length) {
    cards.push({
      icon: GitCompare,
      tone: '#A1A7B3',
      title: 'Why not the others',
      items: explanation.whyNotOthers.slice(0, 3),
    });
  }
  if (explanation?.tradeoffs?.length) {
    cards.push({
      icon: Scale,
      tone: '#FACC15',
      title: 'Tradeoffs',
      chips: explanation.tradeoffs.slice(0, 6),
    });
  }
  if (explanation?.whoIsThisPerfectFor?.length) {
    cards.push({
      icon: UserCheck,
      tone: '#5EEAD4',
      title: 'Who should buy',
      items: explanation.whoIsThisPerfectFor.slice(0, 3),
    });
  }
  if (explanation?.whoShouldAvoid?.length) {
    cards.push({
      icon: UserX,
      tone: '#EF4444',
      title: 'Who should avoid',
      items: explanation.whoShouldAvoid.slice(0, 3),
    });
  }
  if (whyNot?.reasons?.length && whyNot.hasConcerns) {
    cards.push({
      icon: AlertTriangle,
      tone: '#EF4444',
      title: 'Risk analysis',
      items: whyNot.reasons.slice(0, 4),
      risk: true,
    });
  }

  if (!cards.length) return null;

  return (
    <section>
      <SectionLabel index={3}>Decision breakdown</SectionLabel>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: i * 0.06 }}
            className={`card flex flex-col p-7 ${card.risk ? 'border-danger/30' : ''}`}
          >
            <div className="mb-5 flex items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-2xl"
                style={{
                  color: card.tone,
                  background: `${card.tone}1a`,
                  boxShadow: `inset 0 0 0 1px ${card.tone}40`,
                }}
              >
                <card.icon className="h-[18px] w-[18px]" />
              </span>
              <h3 className="text-[15px] font-semibold text-heading">{card.title}</h3>
            </div>

            {card.chips ? (
              <div className="flex flex-wrap gap-2">
                {card.chips.map((chip, j) => (
                  <span key={j} className="chip">{chip}</span>
                ))}
              </div>
            ) : (
              <ul className="space-y-2.5">
                {card.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2.5 text-sm leading-relaxed text-body">
                    <span
                      className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: card.tone }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function ReviewIntelligence({ decision }) {
  const ri = decision?.reviewIntelligence;
  if (!ri) return null;
  const s = ri.summary || {};
  const positive = Number(s.positivePercent) || 0;
  const neutral = Number(s.neutralPercent) || 0;
  const negative = Number(s.negativePercent) || 0;

  return (
    <section>
      <SectionLabel index={4}>Review intelligence</SectionLabel>
      <div className="card p-7 sm:p-9">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <div className="mb-5 flex items-center gap-2">
              <Star className="h-4 w-4 fill-primary-400 text-primary-400" />
              <h3 className="text-[15px] font-semibold text-heading">Sentiment distribution</h3>
            </div>
            <div className="flex h-3 w-full overflow-hidden rounded-full">
              {positive > 0 && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${positive}%` }}
                  transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full bg-success"
                />
              )}
              {neutral > 0 && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${neutral}%` }}
                  transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full bg-soft"
                />
              )}
              {negative > 0 && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${negative}%` }}
                  transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full bg-danger"
                />
              )}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                ['Positive', positive, '#22C55E'],
                ['Neutral', neutral, '#A1A7B3'],
                ['Negative', negative, '#EF4444'],
              ].map(([label, value, color]) => (
                <div key={label} className="rounded-2xl border border-line bg-elevated/50 p-4 text-center">
                  <p className="font-mono text-xl font-semibold" style={{ color }}>{value}%</p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-mute">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {ri.mostLovedFeatures?.length > 0 && (
              <div>
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-success">Most loved</p>
                <div className="flex flex-wrap gap-2">
                  {ri.mostLovedFeatures.slice(0, 6).map((f, i) => (
                    <span key={i} className="rounded-full border border-success/25 bg-success/8 px-3 py-1 text-xs text-body">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {ri.mostComplainedFeatures?.length > 0 && (
              <div>
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-danger">Most complained</p>
                <div className="flex flex-wrap gap-2">
                  {ri.mostComplainedFeatures.slice(0, 6).map((f, i) => (
                    <span key={i} className="rounded-full border border-danger/25 bg-danger/8 px-3 py-1 text-xs text-body">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductIntel({ decision, product }) {
  const lifecycle = decision?.lifecycle;
  const stats = [];

  if (lifecycle?.releaseDate) stats.push({ icon: CalendarDays, label: 'Released', value: new Date(lifecycle.releaseDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) });
  if (lifecycle?.ageYears != null) stats.push({ icon: Clock, label: 'Product age', value: `${lifecycle.ageYears} yr${lifecycle.ageYears === 1 ? '' : 's'}` });
  if (lifecycle?.expectedSuccessor) stats.push({ icon: Sparkles, label: 'Expected successor', value: lifecycle.expectedSuccessor });
  if (product?.marketplace) stats.push({ icon: Package, label: 'Marketplace', value: product.marketplace });
  if (lifecycle?.recommendation) {
    stats.push({
      icon: ShieldCheck,
      label: 'Lifecycle',
      value: lifecycle.recommendationLabel || lifecycle.recommendation,
    });
  }

  if (!stats.length) return null;

  return (
    <section>
      <SectionLabel index={5}>Product intelligence</SectionLabel>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card flex items-start gap-4 p-6"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-elevated">
              <s.icon className="h-[18px] w-[18px] text-primary-400" />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-widest text-mute">{s.label}</p>
              <p className="mt-1 text-sm font-semibold text-heading">{s.value}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function AlternativesSection({ decision, currency, onCompare }) {
  const alts = decision?.alternatives || [];
  if (!alts.length) return null;
  const main = decision?.product;

  return (
    <section>
      <SectionLabel index={7}>Alternatives</SectionLabel>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {alts.slice(0, 3).map((alt, i) => {
          const mainRating = main?.rating || 0;
          const altRating = alt.rating || 0;
          const winner = altRating >= mainRating ? alt : main;
          return (
            <motion.button
              key={alt.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => onCompare(alt)}
              className="card card-hover overflow-hidden text-left"
            >
              <div className="aspect-[4/3] overflow-hidden bg-elevated">
                <img src={alt.image} alt={alt.name} loading="lazy" className="h-full w-full object-cover" />
              </div>
              <div className="p-5">
                <p className="text-[10px] font-mono uppercase tracking-widest text-mute">{alt.brand}</p>
                <p className="mt-1 line-clamp-1 text-[15px] font-semibold text-heading">{alt.name}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-mono text-base font-semibold text-heading">
                    {formatPrice(alt.price, currency)}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-mute">
                    <Star className="h-3 w-3 fill-primary-400 text-primary-400" />
                    {alt.rating || '—'}
                    {winner?.id === alt.id && (
                      <span className="ml-1 rounded-full bg-success/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-success">
                        top rated
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}

function ReportSections({ report }) {
  if (!report?.sections?.length) return null;
  const body = report.sections.filter((s) => s.id !== 'summary' && s.paragraphs?.length);

  return (
    <section>
      <SectionLabel index={6}>Full reasoning</SectionLabel>
      <div className="space-y-5">
        {body.map((section, i) => (
          <motion.div
            key={section.id || i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card p-7 sm:p-8"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-[15px] font-semibold text-heading">{section.title}</h3>
              {section.confidence != null && (
                <span className="rounded-full border border-line bg-elevated px-3 py-1 font-mono text-[11px] text-soft">
                  {section.confidence}% confidence
                </span>
              )}
            </div>
            {section.headline && (
              <p className="mb-3 text-sm font-medium text-primary-300">{section.headline}</p>
            )}
            <div className="space-y-3">
              {section.paragraphs.map((p, j) => (
                <p key={j} className="text-[15px] leading-relaxed text-body">{p}</p>
              ))}
            </div>
            {section.evidence?.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2 border-t border-line/70 pt-5">
                <span className="font-mono text-[10px] uppercase tracking-widest text-mute">Evidence:</span>
                {section.evidence.map((e, j) => (
                  <span key={j} className="rounded-full border border-line bg-elevated px-2.5 py-0.5 text-[11px] text-soft">
                    {e}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prompt = searchParams.get('q') || '';
  const [wishlisted, setWishlisted] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [error, setError] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['product', id],
    queryFn: () => products.getById(id).then((r) => r.data),
    enabled: !!id,
  });

  const product = data?.product || data;
  const relatedProducts = data?.related || [];

  const { data: decisionData, isLoading: decisionLoading } = useQuery({
    queryKey: ['fullDecision', id, prompt],
    queryFn: () => decisionApi.getFull(id, prompt).then((r) => r.data),
    enabled: !!product?.id,
    retry: 1,
    staleTime: 30000,
  });

  const { data: bundleData, isLoading: bundleLoading } = useQuery({
    queryKey: ['bundle', product?.category],
    queryFn: () => decisionApi.getBundle(`I need a ${product?.category || 'product'}`).then((r) => r.data),
    enabled: !!product?.category,
    staleTime: 60000,
  });

  const decision = decisionData?.decision;
  const report = decision?.aiReport;

  const handleWishlist = async () => {
    try {
      if (wishlisted) {
        await wishlistApi.remove(id);
        setWishlisted(false);
      } else {
        await wishlistApi.add(id);
        setWishlisted(true);
      }
    } catch {
      setError('Could not update wishlist');
      setTimeout(() => setError(''), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-4 w-24 rounded-lg" />
        <div className="grid gap-10 lg:grid-cols-2">
          <Skeleton className="aspect-square rounded-4xl" />
          <div className="space-y-4 pt-2">
            <Skeleton className="h-4 w-24 rounded-lg" />
            <Skeleton className="h-9 w-3/4 rounded-xl" />
            <Skeleton className="h-5 w-32 rounded-lg" />
            <Skeleton className="h-6 w-40 rounded-lg" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48 rounded-4xl" />)}
        </div>
        <Skeleton className="h-96 w-full rounded-4xl" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <p className="text-lg text-body">Product not found.</p>
        <button onClick={() => navigate(-1)} className="btn btn-primary btn-md mt-6">
          Go back
        </button>
      </div>
    );
  }

  const aiSummary = report?.summary?.paragraphs?.[0] || decision?.geminiDecision?.explanation || product.description;

  const handleCompare = (alt) => {
    navigate(`/compare?products=${encodeURIComponent([product.id, alt.id].join(','))}`);
  };

  return (
    <div className="space-y-16">
      {error && (
        <div className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-mute transition-colors hover:text-soft"
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </button>

      

      {/* HERO */}
      <section className="grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-4xl border border-line bg-elevated"
        >
          <img src={product.image} alt={product.name} className="aspect-square w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-canvas/40 to-transparent" />
          {report?.verdict && (
            <span
              className="absolute left-5 top-5 rounded-full border px-3.5 py-1.5 font-mono text-[11px] font-semibold backdrop-blur"
              style={{
                color: VERDICT_TONE[report.verdict.color]?.color || '#5EEAD4',
                borderColor: VERDICT_TONE[report.verdict.color]?.border || 'rgba(20,184,166,0.3)',
                background: 'rgba(10,10,11,0.72)',
              }}
            >
              {report.verdict.label}
            </span>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="font-mono text-[11px] uppercase tracking-widest text-mute">{product.brand}</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight text-heading sm:text-4xl">
            {product.name}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 text-sm text-body">
              <Star className="h-4 w-4 fill-primary-400 text-primary-400" />
              <span className="font-semibold text-heading">{product.rating}</span>
              <span className="text-mute">({product.reviews} reviews)</span>
            </span>
            {decision?.suitability && (
              <span className="chip">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-400" />
                {decision.suitability.score}% suited to you
              </span>
            )}
          </div>

          <div className="mt-6 flex items-baseline gap-3">
            <span className="font-mono text-4xl font-semibold tracking-tight text-heading">
              {formatPrice(product.price, product.currency)}
            </span>
            {product.originalPrice && (
              <span className="font-mono text-lg text-mute line-through">
                {formatPrice(product.originalPrice, product.currency)}
              </span>
            )}
            {report?.verdict && (
              <span
                className="font-mono text-sm font-semibold"
                style={{ color: VERDICT_TONE[report.verdict.color]?.color || '#5EEAD4' }}
              >
                {VERDICT_TONE[report.verdict.color]?.label}
              </span>
            )}
          </div>

          <div className="mt-6 rounded-3xl border border-primary-500/20 bg-primary-700/8 p-6">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary-400" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary-300">
                AI summary
              </span>
            </div>
            <p className="text-[15px] leading-relaxed text-body">{aiSummary}</p>
          </div>

          <div className="mt-7 flex flex-wrap gap-2.5">
            <button
              onClick={handleWishlist}
              className={`btn btn-lg flex-1 sm:flex-auto ${wishlisted ? 'bg-danger/10 text-danger border border-danger/30' : 'btn-secondary'}`}
            >
              <Heart className={`h-[18px] w-[18px] ${wishlisted ? 'fill-danger' : ''}`} />
              {wishlisted ? 'Saved' : 'Save'}
            </button>
            <button onClick={() => handleCompare(product)} className="btn btn-secondary btn-lg flex-1 sm:flex-auto">
              <GitCompare className="h-[18px] w-[18px]" />
              Compare
            </button>
            <button
              onClick={() => setShowQuestions(!showQuestions)}
              className={`btn btn-lg flex-1 sm:flex-auto ${showQuestions ? 'bg-primary-700/15 text-primary-300 border border-primary-500/25' : 'btn-secondary'}`}
            >
              <MessageCircleQuestion className="h-[18px] w-[18px]" />
              {showQuestions ? 'Hide questions' : 'Ask AI'}
            </button>
            <button
              className="btn btn-ghost btn-lg flex-1 sm:flex-auto"
              aria-label="Share"
              onClick={() => navigator.clipboard?.writeText(window.location.href)}
            >
              <Share2 className="h-[18px] w-[18px]" />
            </button>
          </div>

          <AnimatePresence>
            {showQuestions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-6">
                  <FollowUpQuestions productId={id} prompt={prompt || product.name} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </section>

      {/* Verdict banner */}
      {decisionLoading ? (
        <Skeleton className="h-72 rounded-4xl" />
      ) : (
        <VerdictBanner report={report} buyDecision={decision?.buyDecision} />
      )}

      {/* Personalization */}
      {report?.personalization?.present && report.personalization.text && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="card border-primary-500/25 p-7"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-700/15 ring-1 ring-inset ring-primary-500/25">
              <UserCheck className="h-[18px] w-[18px] text-primary-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-heading">Personalized for you</p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-mute">
                {report.personalization.confidence}% personal confidence
              </p>
            </div>
          </div>
          <p className="mt-4 text-[15px] leading-relaxed text-body">{report.personalization.text}</p>
        </motion.div>
      )}

      <ScoreCluster decision={decision} />
      <PriceIntelligence decision={decision} currency={product.currency} />
      <DecisionBreakdown decision={decision} />
      <ReviewIntelligence decision={decision} />
      <ProductIntel decision={decision} product={product} />
      <ReportSections report={report} />
      <AlternativesSection decision={decision} currency={product.currency} onCompare={(alt) => handleCompare(alt)} />


      {/* Smart bundle */}
      {bundleData?.bundle && (
        <SmartBundle bundle={bundleData.bundle} isLoading={bundleLoading} currency={product.currency} />
      )}

      {/* Related */}
      {relatedProducts.length > 0 && (
        <section>
          <div className="mb-6">
            <h2 className="text-xl font-semibold tracking-tight text-heading">You may also want to compare</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {relatedProducts.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
  
}
