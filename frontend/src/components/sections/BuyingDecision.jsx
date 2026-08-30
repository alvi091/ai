import { motion } from 'framer-motion';
import {
  ShieldCheck, TrendingUp, TrendingDown, Minus, AlertTriangle,
  IndianRupee, Clock, Target, ShieldAlert, UserCheck, UserX,
  Star, ArrowDown, ArrowUp, Equal, Sparkles,
} from 'lucide-react';

const VERDICT = {
  BUY_NOW:              { label: 'BUY NOW',      color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', glow: 'shadow-emerald-500/20', icon: ShieldCheck },
  BEST_IN_CATEGORY:     { label: 'BUY NOW',      color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', glow: 'shadow-emerald-500/20', icon: ShieldCheck },
  EXCELLENT_LONG_TERM:  { label: 'BUY NOW',      color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', glow: 'shadow-emerald-500/20', icon: ShieldCheck },
  GREAT_ENTRY_LEVEL:    { label: 'BUY NOW',      color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', glow: 'shadow-emerald-500/20', icon: ShieldCheck },
  PREMIUM_CHOICE:       { label: 'BUY NOW',      color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', glow: 'shadow-emerald-500/20', icon: ShieldCheck },
  WAIT:                 { label: 'WAIT',         color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/25',   glow: 'shadow-amber-500/20',   icon: Clock },
  BUY_DURING_SALE:      { label: 'WAIT FOR SALE',color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/25',   glow: 'shadow-amber-500/20',   icon: Clock },
  GOOD_BUT_OVERPRICED:  { label: 'WAIT',         color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/25',   glow: 'shadow-amber-500/20',   icon: Clock },
  NOT_RECOMMENDED:      { label: 'AVOID',        color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/25',     glow: 'shadow-red-500/20',     icon: ShieldAlert },
  BETTER_ALTERNATIVES:  { label: 'AVOID',        color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/25',     glow: 'shadow-red-500/20',     icon: ShieldAlert },
  GOOD_FOR_SPECIFIC:    { label: 'MAYBE',        color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/25',    glow: 'shadow-blue-500/20',    icon: Target },
};

function getVerdict(key) {
  return VERDICT[key] || VERDICT.WAIT;
}

const FIT_STYLE = {
  high: 'border-emerald-500/20 bg-emerald-500/[0.04]',
  good: 'border-blue-500/20 bg-blue-500/[0.04]',
  ok:   'border-amber-500/20 bg-amber-500/[0.04]',
  low:  'border-red-500/20 bg-red-500/[0.04]',
};

const PERSONA_ICON = {
  student: '🎓', developer: '💻', gamer: '🎮', professional: '💼', travel: '✈️',
  office: '🏢', photography: '📷', fitness: '🏋️', parents: '👶', business: '🏪',
  creator: '🎬', casual: '😌', skincare: '✨', haircare: '💧', oily_skin: '💧',
  sensitive: '🛡️', budget: '💰', premium: '👑', men: '🧑', women: '👩',
};

function TrendArrow({ trend }) {
  const dir = typeof trend === 'string' ? trend : trend?.direction || 'unknown';
  if (dir === 'down')  return <ArrowDown className="h-4 w-4 text-emerald-400" />;
  if (dir === 'up')    return <ArrowUp className="h-4 w-4 text-red-400" />;
  return <Equal className="h-4 w-4 text-white/40" />;
}

function ScoreRing({ score, size = 56, stroke = 4, color = 'emerald' }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const cls = { emerald: 'stroke-emerald-400', amber: 'stroke-amber-400', red: 'stroke-red-400', blue: 'stroke-blue-400' };
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        className={cls[color] || cls.emerald}
        strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, delay: 0.3 }}
      />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        className="fill-white text-[13px] font-bold rotate-90" style={{ transformOrigin: 'center' }}>
        {score}
      </text>
    </svg>
  );
}

export default function BuyingDecision({ report, analytics, personas, marketplace }) {
  const verdict = report?.verdict;
  const price = report?.intelligence?.price;
  const risk = analytics?.risk;
  const worth = analytics?.worth;
  if (!verdict) return null;

  const v = getVerdict(verdict.verdict || verdict.key);
  const Icon = v.icon;
  const confidence = verdict.confidence || 0;
  const factors = verdict.factors || [];
  const pros = factors.filter((f) => f.direction === 'positive');
  const cons = factors.filter((f) => f.direction === 'negative');
  const bestMarketplace = marketplace?.bestPlace || null;
  const shouldBuy = personas?.shouldBuy || [];
  const shouldAvoid = personas?.shouldAvoid || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-transparent" />

      <div className="relative px-6 py-8 sm:px-10 sm:py-12 space-y-8">

        {/* ── VERDICT HEADER ── */}
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className={`inline-flex items-center gap-3 rounded-2xl ${v.bg} ${v.border} border px-8 py-4 shadow-lg ${v.glow}`}
          >
            <Icon className={`h-7 w-7 ${v.color}`} />
            <span className={`font-display text-4xl sm:text-5xl font-bold tracking-tight ${v.color}`}>
              {v.label}
            </span>
          </motion.div>

          <div className="mt-5 flex items-center gap-3">
            <div className="relative h-3 w-36 overflow-hidden rounded-full bg-white/10">
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
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/65">{verdict.rationale}</p>
          )}
        </div>

        {/* ── QUICK STATS ROW ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Worth Score */}
          {worth && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-4 flex flex-col items-center gap-2">
              <ScoreRing score={worth.score || 0} color={worth.score >= 70 ? 'emerald' : worth.score >= 40 ? 'amber' : 'red'} />
              <span className="text-[11px] text-white/40 text-center">{worth.label || worth.tier || 'Value'}</span>
            </div>
          )}
          {/* Risk */}
          {risk && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-4 flex flex-col items-center gap-2">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                (risk.regretProbability || 0) <= 20 ? 'bg-emerald-500/10 text-emerald-400' :
                (risk.regretProbability || 0) <= 50 ? 'bg-amber-500/10 text-amber-400' :
                'bg-red-500/10 text-red-400'
              }`}>
                <span className="text-sm font-bold">{risk.regretProbability || 0}%</span>
              </div>
              <span className="text-[11px] text-white/40 text-center">{risk.riskLabel || 'Regret Risk'}</span>
            </div>
          )}
          {/* Price Fairness */}
          {price && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-4 flex flex-col items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
                <IndianRupee className="h-5 w-5 text-blue-400" />
              </div>
              <span className="text-[11px] text-white/40 text-center">{price.fairnessLabel || 'Price Check'}</span>
              {price.discountPercent > 0 && (
                <span className="text-[11px] font-medium text-emerald-400">{price.discountPercent}% off</span>
              )}
            </div>
          )}
          {/* Price Trend */}
          {price && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-4 flex flex-col items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
                <TrendArrow trend={price.priceTrend} />
              </div>
              <span className="text-[11px] text-white/40 text-center capitalize">
                {typeof price.priceTrend === 'string' ? price.priceTrend : price.priceTrend?.direction || 'stable'}
              </span>
              {price.bestTimeToBuy && typeof price.bestTimeToBuy === 'string' && (
                <span className="text-[11px] text-white/30 text-center">{price.bestTimeToBuy}</span>
              )}
            </div>
          )}
        </div>

        {/* ── PROS & CONS ── */}
        {(pros.length > 0 || cons.length > 0) && (
          <div>
            <h4 className="text-[13px] font-semibold text-white/50 uppercase tracking-wider mb-3">Decision Factors</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {pros.length > 0 && (
                <div className="space-y-2">
                  {pros.map((f, i) => (
                    <motion.div key={`p${i}`} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.05 }}
                      className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.03] px-4 py-3"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-[13px] font-medium text-emerald-400/90">{f.label}</span>
                      </div>
                      {f.detail && <p className="text-[12px] leading-relaxed text-white/50">{f.detail}</p>}
                    </motion.div>
                  ))}
                </div>
              )}
              {cons.length > 0 && (
                <div className="space-y-2">
                  {cons.map((f, i) => (
                    <motion.div key={`c${i}`} initial={{ opacity: 0, x: 5 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.05 }}
                      className="rounded-xl border border-red-500/15 bg-red-500/[0.03] px-4 py-3"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                        <span className="text-[13px] font-medium text-red-400/80">{f.label}</span>
                      </div>
                      {f.detail && <p className="text-[12px] leading-relaxed text-white/50">{f.detail}</p>}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── BEST MARKETPLACE ── */}
        {bestMarketplace && marketplace?.comparisons?.length > 0 && (
          <div>
            <h4 className="text-[13px] font-semibold text-white/50 uppercase tracking-wider mb-3">Where to Buy</h4>
            <div className="flex flex-wrap gap-2">
              {marketplace.comparisons.map((c, i) => (
                <a key={i} href={c.url} target="_blank" rel="noopener noreferrer"
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 transition-colors ${
                    c.marketplace === bestMarketplace
                      ? 'border-emerald-500/25 bg-emerald-500/[0.06] hover:bg-emerald-500/10'
                      : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="text-[13px] font-medium text-white/80">{c.marketplace}</span>
                  {c.price && <span className="text-[12px] font-bold text-white/90">₹{c.price.toLocaleString('en-IN')}</span>}
                  {c.marketplace === bestMarketplace && <Sparkles className="h-3.5 w-3.5 text-emerald-400" />}
                </a>
              ))}
            </div>
            <p className="mt-2 text-[12px] text-white/30">Best price at <span className="text-emerald-400/80 font-medium">{bestMarketplace}</span></p>
          </div>
        )}

        {/* ── WHO SHOULD / SHOULDN'T BUY ── */}
        {/* {(shouldBuy.length > 0 || shouldAvoid.length > 0) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {shouldBuy.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <UserCheck className="h-4 w-4 text-emerald-400" />
                  <span className="text-[13px] font-semibold text-emerald-400">Best For</span>
                </div>
                <div className="space-y-2">
                  {shouldBuy.map((p, i) => (
                    <div key={i} className={`rounded-xl border px-4 py-3 ${FIT_STYLE[p.fit] || FIT_STYLE.ok}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-base">{PERSONA_ICON[p.key] || '👤'}</span>
                        <span className="text-[13px] font-medium text-white/80">{p.label}</span>
                      </div>
                      {p.why && <p className="mt-1 text-[11px] text-white/40">{p.why}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {shouldAvoid.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <UserX className="h-4 w-4 text-red-400" />
                  <span className="text-[13px] font-semibold text-red-400">Not Ideal For</span>
                </div>
                <div className="space-y-2">
                  {shouldAvoid.map((p, i) => (
                    <div key={i} className="rounded-xl border border-red-500/15 bg-red-500/[0.03] px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{PERSONA_ICON[p.key] || '👤'}</span>
                        <span className="text-[13px] font-medium text-red-400/80">{p.label}</span>
                      </div>
                      {p.why && <p className="mt-1 text-[11px] text-red-400/50">{p.why}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )} */}

        {/* ── BOTTOM LINE ── */}
        {/* <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-5">
          <div className="flex items-start gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${v.bg} ${v.border} border`}>
              <Sparkles className={`h-5 w-5 ${v.color}`} />
            </div>
            <div>
              <h4 className="text-[14px] font-semibold text-white/80 mb-1">Bottom Line</h4>
              <p className="text-[13px] leading-relaxed text-white/55">
                {verdict.key?.includes('BUY') || verdict.key === 'BEST_IN_CATEGORY' || verdict.key === 'PREMIUM_CHOICE' || verdict.key === 'GREAT_ENTRY_LEVEL' || verdict.key === 'EXCELLENT_LONG_TERM'
                  ? `This is a solid purchase at ₹${analytics?.price?.current?.toLocaleString('en-IN') || 'the listed price'}. ${confidence >= 70 ? 'High confidence in this recommendation.' : 'Moderate confidence — check reviews for your specific use case.'}`
                  : verdict.key?.includes('WAIT') || verdict.key === 'BUY_DURING_SALE' || verdict.key === 'GOOD_BUT_OVERPRICED'
                  ? `Hold off for now. ${price?.bestTimeToBuy && typeof price.bestTimeToBuy === 'string' ? `Best time to buy: ${price.bestTimeToBuy}.` : 'Check back during upcoming sales for a better deal.'} ${price?.savingsOpportunity ? `Potential savings: ₹${Number(price.savingsOpportunity).toLocaleString('en-IN')}.` : ''}`
                  : `Look at alternatives first. ${cons.length > 0 ? cons.map((c) => c.label).join(' and ') + ' are significant concerns.' : 'Better options exist in this price range.'}`
                }
              </p>
            </div>
          </div>
        </div> */}
      </div>
    </motion.div>
  );
}
