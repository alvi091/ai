import { motion } from 'framer-motion';
import { Sparkles, UserRound, Database, AlertTriangle } from 'lucide-react';
import PriceTrendChart from './PriceTrendChart';
import VerdictPill from './VerdictPill';
import { fadeUp } from './motion';

function ConfidencePill({ value }) {
  const tone =
    value >= 80 ? 'verdict-buy' : value >= 60 ? 'verdict-later' : 'verdict-wait';
  return <span className={`pill ${tone} !text-[10px]`}>{value}% confidence</span>;
}

function EvidenceList({ evidence }) {
  if (!evidence || evidence.length === 0) return null;
  return (
    <div className="mt-4 pt-4 border-t border-line">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400 mb-2">
        Signals used
      </p>
      <ul className="space-y-1.5">
        {evidence.map((e, i) => (
          <li key={i} className="text-[12px] text-ink-400 flex items-start gap-2 leading-relaxed">
            <Database className="w-3 h-3 mt-0.5 shrink-0 text-accent-400" />
            <span className="break-words">{e}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function sectionTone(id) {
  if (id === 'price') return { icon: Sparkles };
  return { icon: Sparkles };
}

export default function AIReport({ report }) {
  if (!report || !report.verdict) return null;

  const { verdict, sections = [], personalization, dataQuality, summary, priceHistory = [], currency } = report;
  const bodySections = sections.filter((s) => s.id !== 'summary');
  const hasChart = Array.isArray(priceHistory) && priceHistory.length >= 2;

  return (
    <div className="space-y-5">
      {/* Verdict banner */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="card p-7 overflow-hidden relative">
        <div
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(closest-side, rgba(15,118,110,0.18), transparent)' }}
        />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-accent-600/10 border border-accent-600/25 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-accent-400" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-400 mb-1">
                AI Decision
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="font-display text-2xl font-semibold text-ink-100">{verdict.label}</h3>
                <VerdictPill decision={verdict.label} size="md" />
              </div>
              <p className="mt-1 text-[13px] text-ink-400">
                {verdict.confidence}% confidence · based on synthesized signals
              </p>
            </div>
          </div>
          <ConfidencePill value={verdict.confidence} />
        </div>
        <p className="relative mt-5 text-[15px] text-ink-300 leading-relaxed">{verdict.rationale}</p>

        {summary?.paragraphs?.length >= 3 && (
          <p className="relative mt-4 text-[13px] text-ink-400 leading-relaxed border-t border-line pt-4">
            {summary.paragraphs[2]}
          </p>
        )}

        {verdict.factors && verdict.factors.length > 0 && (
          <div className="relative mt-5 grid sm:grid-cols-2 gap-3">
            {verdict.factors.map((f, i) => (
              <div
                key={i}
                className={`rounded-2xl border px-4 py-3 ${
                  f.direction === 'positive'
                    ? 'bg-success/8 border-success/25'
                    : f.direction === 'negative'
                      ? 'bg-danger/8 border-danger/25'
                      : 'bg-surface-200 border-line'
                }`}
              >
                <p className="text-[12px] font-semibold text-ink-100">{f.label}</p>
                <p className="text-[12px] text-ink-400 mt-0.5 leading-relaxed">{f.detail}</p>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Personalization */}
      {personalization && personalization.present && (
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="card p-6">
          <div className="flex items-center gap-2.5 mb-3">
            <UserRound className="w-4 h-4 text-accent-400" />
            <h4 className="font-display text-[15px] font-semibold text-ink-100">For you</h4>
            <span className="ml-auto">{personalization.confidence != null && <ConfidencePill value={personalization.confidence} />}</span>
          </div>
          <p className="text-sm text-ink-300 leading-relaxed">{personalization.text}</p>
        </motion.div>
      )}

      {/* Data quality */}
      {dataQuality && (dataQuality.level === 'limited' || dataQuality.level === 'sparse') && dataQuality.notes?.length > 0 && (
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="card p-5 border-warning/25 bg-warning/[0.04]">
          <div className="flex items-center gap-2.5 mb-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <h4 className="text-sm font-semibold text-ink-100">Limited data — read with care</h4>
          </div>
          <ul className="space-y-1">
            {dataQuality.notes.map((n, i) => (
              <li key={i} className="text-[12px] text-ink-400 flex items-start gap-2">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-warning shrink-0" />
                {n}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Sections */}
      {bodySections.map((section, i) => {
        const { icon } = sectionTone(section.id);
        const Icon = icon;
        return (
          <motion.div
            key={section.id || i}
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-40px' }}
            transition={{ delay: Math.min(i * 0.03, 0.2) }}
            className="card p-6"
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 text-accent-400" />
                <h4 className="font-display text-[15px] font-semibold text-ink-100">{section.title}</h4>
              </div>
              {section.confidence != null && <ConfidencePill value={section.confidence} />}
            </div>
            {section.headline && (
              <p className="text-[12px] font-medium text-accent-400 mb-2">{section.headline}</p>
            )}
            <div className="space-y-2.5">
              {section.paragraphs.map((p, j) => (
                <p key={j} className="text-sm text-ink-300 leading-relaxed">{p}</p>
              ))}
            </div>

            {section.id === 'price' && hasChart && (
              <div className="mt-5 pt-5 border-t border-line">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400 mb-3">
                  Price history
                </p>
                <PriceTrendChart priceHistory={priceHistory} currency={currency} currentPrice={report.priceCurrent} />
              </div>
            )}

            <EvidenceList evidence={section.evidence} />
          </motion.div>
        );
      })}

      {hasChart && !bodySections.some((s) => s.id === 'price') && (
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="card p-6">
          <h4 className="font-display text-[15px] font-semibold text-ink-100 mb-4">Price history</h4>
          <PriceTrendChart priceHistory={priceHistory} currency={currency} currentPrice={report.priceCurrent} />
        </motion.div>
      )}
    </div>
  );
}
