import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingDown, TrendingUp, Minus, ChevronDown, ChevronUp, Sparkles,
  AlertTriangle, HeartHandshake, PackageCheck, Scale, ShieldAlert,
} from 'lucide-react';
import ScoreGauge from './ScoreGauge';
import ConfidenceRing from './ConfidenceRing';
import VerdictPill from './VerdictPill';
import { HBar } from './Bars';
import PriceTrendChart from './PriceTrendChart';
import { formatPrice } from '../../utils/format';
import { fadeUp } from './motion';

function Section({ icon: Icon, title, children, delay = 0 }) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay }}
      className="card p-6"
    >
      <div className="flex items-center gap-2.5 mb-4">
        <Icon className="w-4 h-4 text-accent-400" />
        <h3 className="font-display text-[15px] font-semibold text-ink-100">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

export default function DecisionCard({ decision, isLoading }) {
  const [expanded, setExpanded] = useState(false);
  if (!decision && !isLoading) return null;

  if (isLoading) {
    return (
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="shimmer w-12 h-12 rounded-2xl" />
          <div className="space-y-2 flex-1">
            <div className="shimmer h-5 w-44" />
            <div className="shimmer h-3 w-28" />
          </div>
        </div>
        <div className="flex items-center justify-center gap-8 py-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="shimmer rounded-full" style={{ width: 96, height: 96 }} />
          ))}
        </div>
        <div className="shimmer h-40 w-full rounded-2xl" />
        <div className="shimmer h-24 w-full rounded-2xl" />
      </div>
    );
  }

  const { product, suitability, priceFairness, buyDecision, matchScore, buyerRegret, happiness, lifecycle, reviewIntelligence, whyNotBuy, decisionExplanation, geminiDecision, alternatives } = decision;

  const priceHistory = decision.priceFairness?.priceHistory || [];
  const chartData = Array.isArray(priceHistory) ? priceHistory.map((p) => ({
    date: typeof p.date === 'string' ? p.date.slice(5) : p.date,
    price: p.price,
  })) : [];

  const confidence = buyDecision?.confidence || 0;
  const verdictKey = buyDecision?.decision || 'wait';

  return (
    <div className="space-y-5">
      {/* Verdict header */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="card p-7 relative overflow-hidden">
        <div
          className="absolute -top-28 -right-28 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(closest-side, rgba(15,118,110,0.16), transparent)' }}
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4 mb-7">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-accent-600/10 border border-accent-600/25 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-accent-400" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-ink-100">AI Decision</h2>
              <p className="text-[12px] text-ink-400">Comprehensive buying analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-ink-400 font-medium">
              {confidence > 0 ? `${confidence}% confidence` : ''}
            </span>
            <VerdictPill decision={verdictKey} size="lg" />
          </div>
        </div>

        <div className="relative grid lg:grid-cols-[auto_1fr] gap-8 items-center">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {suitability && (
              <ScoreGauge value={suitability.score} size={128} strokeWidth={9} label="Suitability" />
            )}
            {happiness && (
              <ScoreGauge value={happiness.score} size={128} strokeWidth={9} label="Happiness" />
            )}
            {buyDecision && (
              <ConfidenceRing value={buyDecision.confidence} size={128} strokeWidth={9} label="Confidence" />
            )}
            {buyerRegret && (
              <ScoreGauge
                value={100 - buyerRegret.regretProbability}
                size={128}
                strokeWidth={9}
                label="Regret safety"
              />
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-baseline gap-3">
              <span className="font-display text-3xl font-semibold text-ink-100">
                {formatPrice(product?.price, product?.currency)}
              </span>
              {product?.originalPrice && (
                <span className="text-[15px] text-ink-400 line-through">
                  {formatPrice(product.originalPrice, product.currency)}
                </span>
              )}
              {priceFairness?.discountPercent > 0 && (
                <span className="pill verdict-buy !text-[11px]">-{priceFairness.discountPercent}%</span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Fair price', value: priceFairness?.fairPrice || product?.price, cls: 'text-ink-100' },
                { label: 'Lowest ever', value: priceFairness?.lowestEver || product?.price, cls: 'text-success' },
                { label: 'Highest ever', value: priceFairness?.highestEver || product?.price, cls: 'text-danger' },
              ].map((c) => (
                <div key={c.label} className="rounded-2xl border border-line bg-surface-200 px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-ink-400 mb-1">{c.label}</p>
                  <p className={`text-[13px] font-semibold ${c.cls}`}>{formatPrice(c.value, product?.currency)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Price intelligence */}
      {chartData.length > 1 && (
        <Section icon={TrendingUp} title="Price intelligence">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] text-ink-400">Historical trend</span>
            <span className="chip">
              {priceFairness?.expectedTrend || 'Stable'}
            </span>
          </div>
          <PriceTrendChart
            priceHistory={chartData}
            currency={product?.currency}
            currentPrice={product?.price}
          />
        </Section>
      )}

      {/* Deal + risk */}
      <div className="grid sm:grid-cols-2 gap-5">
        {priceFairness && (
          <Section icon={Scale} title="Deal quality">
            <div className="flex items-center gap-4">
              <ScoreGauge value={priceFairness.fairnessScore} size={120} strokeWidth={9} />
              <div>
                <p className="font-display text-lg font-semibold text-ink-100 capitalize">
                  {String(priceFairness.verdict || 'fair').replace(/_/g, ' ')}
                </p>
                <p className="text-[12px] text-ink-400 mt-1 leading-relaxed">
                  {priceFairness.discountPercent > 0
                    ? `Currently ${priceFairness.discountPercent}% below recent average.`
                    : 'Price is within normal range.'}
                </p>
              </div>
            </div>
          </Section>
        )}

        {buyerRegret && (
          <Section icon={ShieldAlert} title="Buyer regret risk">
            <div className="flex items-center gap-4">
              <ScoreGauge value={100 - buyerRegret.regretProbability} size={120} strokeWidth={9} />
              <div>
                <p className="font-display text-lg font-semibold text-ink-100">
                  {buyerRegret.riskLabel || 'Low risk'}
                </p>
                <p className="text-[12px] text-ink-400 mt-1 leading-relaxed">
                  {buyerRegret.regretProbability}% likelihood of regret within the first year.
                </p>
              </div>
            </div>
          </Section>
        )}
      </div>

      {/* Match score */}
      {matchScore?.matched?.length > 0 && (
        <Section icon={PackageCheck} title="How well it matches you">
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
            {matchScore.matched.slice(0, 6).map((m, i) => (
              <HBar key={i} label={m.label} value={Number(m.score) || 0} />
            ))}
          </div>
        </Section>
      )}

      {/* Why not buy */}
      {whyNotBuy?.reasons?.length > 0 && whyNotBuy.hasConcerns && (
        <Section icon={AlertTriangle} title="Reasons not to buy" tone="danger" className="border-danger/25 bg-danger/[0.03]">
          <ul className="space-y-2.5">
            {whyNotBuy.reasons.slice(0, 5).map((reason, i) => (
              <li key={i} className="text-[13px] text-ink-300 flex items-start gap-3 leading-relaxed">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-danger shrink-0" />
                {reason}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Decision explanation */}
      {decisionExplanation && (
        <Section icon={HeartHandshake} title="Why this product?">
          {decisionExplanation.whyThis?.slice(0, 3).map((why, i) => (
            <p key={i} className="text-sm text-ink-300 flex items-start gap-3 leading-relaxed mb-2.5">
              <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-accent-500 shrink-0" />
              {why}
            </p>
          ))}

          {decisionExplanation.tradeoffs?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-line">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400 mb-2.5">Tradeoffs</p>
              <div className="flex flex-wrap gap-2">
                {decisionExplanation.tradeoffs.map((t, i) => (
                  <span key={i} className="chip">{t}</span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-accent-400 hover:text-accent-300 transition-colors"
          >
            {expanded ? 'Show less' : 'Full analysis'}
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-line space-y-5">
                  {decisionExplanation.whyNotOthers?.length > 0 && (
                    <div>
                      <p className="text-[12px] font-semibold text-ink-100 mb-2">Why not others</p>
                      <ul className="space-y-1.5">
                        {decisionExplanation.whyNotOthers.map((w, i) => (
                          <li key={i} className="text-[13px] text-ink-400 flex items-start gap-2">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-warning shrink-0" />{w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {decisionExplanation.whoShouldAvoid?.length > 0 && (
                    <div>
                      <p className="text-[12px] font-semibold text-ink-100 mb-2">Who should avoid</p>
                      <ul className="space-y-1.5">
                        {decisionExplanation.whoShouldAvoid.map((w, i) => (
                          <li key={i} className="text-[13px] text-ink-400 flex items-start gap-2">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-danger shrink-0" />{w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {decisionExplanation.whoIsThisPerfectFor?.length > 0 && (
                    <div>
                      <p className="text-[12px] font-semibold text-ink-100 mb-2">Perfect for</p>
                      <ul className="space-y-1.5">
                        {decisionExplanation.whoIsThisPerfectFor.map((w, i) => (
                          <li key={i} className="text-[13px] text-ink-400 flex items-start gap-2">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-success shrink-0" />{w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Section>
      )}

      {/* Suitability breakdown */}
      {suitability?.breakdown?.length > 0 && (
        <Section icon={PackageCheck} title="Suitability breakdown">
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
            {suitability.breakdown.map((b, i) => (
              <HBar key={i} label={b.label} value={Number(b.score) || 0} />
            ))}
          </div>
        </Section>
      )}

      {/* Review intelligence */}
      {reviewIntelligence && (
        <Section icon={Sparkles} title="Review intelligence">
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Positive', value: reviewIntelligence.summary?.positivePercent || 0, cls: 'text-success' },
              { label: 'Neutral', value: reviewIntelligence.summary?.neutralPercent || 0, cls: 'text-ink-200' },
              { label: 'Negative', value: reviewIntelligence.summary?.negativePercent || 0, cls: 'text-danger' },
            ].map((c) => (
              <div key={c.label} className="rounded-2xl border border-line bg-surface-200 p-4 text-center">
                <p className={`font-display text-2xl font-semibold ${c.cls}`}>{c.value}%</p>
                <p className="text-[11px] uppercase tracking-[0.12em] text-ink-400 mt-1">{c.label}</p>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {reviewIntelligence.mostLovedFeatures?.length > 0 && (
              <div>
                <p className="text-[12px] font-semibold text-success mb-2">Most loved</p>
                <div className="flex flex-wrap gap-1.5">
                  {reviewIntelligence.mostLovedFeatures.map((f, i) => (
                    <span key={i} className="chip">{f}</span>
                  ))}
                </div>
              </div>
            )}
            {reviewIntelligence.mostComplainedFeatures?.length > 0 && (
              <div>
                <p className="text-[12px] font-semibold text-danger mb-2">Most complained</p>
                <div className="flex flex-wrap gap-1.5">
                  {reviewIntelligence.mostComplainedFeatures.map((f, i) => (
                    <span key={i} className="chip">{f}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Lifecycle */}
      {lifecycle && lifecycle.releaseDate && (
        <Section icon={TrendingDown} title="Product lifecycle">
          <div className="grid grid-cols-2 gap-5 text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-ink-400 mb-1">Released</p>
              <p className="font-medium text-ink-100">{new Date(lifecycle.releaseDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-ink-400 mb-1">Age</p>
              <p className="font-medium text-ink-100">{lifecycle.ageYears} years</p>
            </div>
            {lifecycle.expectedSuccessor && (
              <div className="col-span-2">
                <p className="text-[11px] uppercase tracking-[0.12em] text-ink-400 mb-1">Expected successor</p>
                <p className="font-medium text-ink-100">{lifecycle.expectedSuccessor}</p>
              </div>
            )}
          </div>
          {lifecycle.recommendationLabel && (
            <div className="mt-4">
              <VerdictPill decision={lifecycle.recommendation === 'buy' ? 'BUY_NOW' : lifecycle.recommendation === 'wait' ? 'WAIT' : 'NOT_RECOMMENDED'} />
              <span className="text-[12px] text-ink-400 ml-2">{lifecycle.recommendationLabel}</span>
            </div>
          )}
        </Section>
      )}

      {/* Alternatives */}
      {alternatives?.length > 0 && (
        <Section icon={Minus} title="Considered alternatives">
          <div className="space-y-1">
            {alternatives.slice(0, 3).map((alt, i) => (
              <a
                key={alt.id || i}
                href={`/products/${alt.id}`}
                className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-surface-200 transition-colors"
              >
                <img src={alt.image} alt={alt.name} className="w-11 h-11 rounded-xl object-cover bg-surface-200 border border-line" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-ink-100 truncate">{alt.name}</p>
                  <p className="text-[11px] text-ink-400">{alt.brand}</p>
                </div>
                <span className="text-[13px] font-semibold text-ink-100">{formatPrice(alt.price, product?.currency)}</span>
              </a>
            ))}
          </div>
        </Section>
      )}

      {/* Gemini insight */}
      {geminiDecision && geminiDecision.explanation && (
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="card p-6 border-accent-600/30 bg-accent-600/[0.05]">
          <div className="flex items-center gap-2.5 mb-2">
            <Sparkles className="w-4 h-4 text-accent-400" />
            <h3 className="font-display text-[15px] font-semibold text-ink-100">AI insight</h3>
          </div>
          <p className="text-sm text-ink-300 leading-relaxed">{geminiDecision.explanation}</p>
          {geminiDecision.why_now && (
            <p className="text-sm text-ink-400 leading-relaxed mt-1.5">{geminiDecision.why_now}</p>
          )}
        </motion.div>
      )}
    </div>
  );
}
