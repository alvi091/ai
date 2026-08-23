import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link2, ScanSearch, Sparkles, Users, FileText,
  RotateCcw, AlertTriangle, ArrowUpRight, Tag, Star, ShieldCheck, CheckCircle2,
} from 'lucide-react';
import { analyzeUrl } from '../services/api';
import DEMO_REPORT from '../lib/demoReport';
import PageHeader from '../components/ui/PageHeader';
import AIReport from '../components/ui/AIReport';
import ScoreGauge from '../components/ui/ScoreGauge';
import { fadeUp } from '../lib/motion';

const STEPS = [
  'Validating & detecting website',
  'Fetching the product page',
  'Extracting structured metadata',
  'Reading page structure',
  'Cleaning & normalizing',
  'Collecting reviews',
  'Scoring worth, risk & timing',
  'Assembling your decision report',
];

const PLACEHOLDER = 'Paste any supported product URL — e.g. https://www.amazon.in/dp/…';

const SUPPORTED = ['amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'apple', 'samsung', 'nike', 'adidas', 'croma', 'Reliance Digital'];

function dimTone(score) {
  if (score == null) return { cls: 'border-line text-ink-500', label: 'No signal yet' };
  if (score >= 70) return { cls: 'border-success/25 bg-success/[0.06] text-success', label: 'Strong' };
  if (score >= 50) return { cls: 'border-teal-300/25 bg-teal-300/[0.06] text-teal-300', label: 'Mixed' };
  return { cls: 'border-danger/25 bg-danger/[0.06] text-danger', label: 'Caution' };
}

const PERSONA_ICONS = {
  student: '🎓', developer: '💻', gamer: '🎮', professional: '💼', travel: '✈️',
  office: '🏢', photography: '📷', fitness: '🏋️', parents: '👶', business: '🏪',
  creator: '🎬', casual: '😌',
};

export default function Analyze() {
  const [url, setUrl] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | loading | done | error
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [errorKind, setErrorKind] = useState(null);
  const [simSteps, setSimSteps] = useState([]);
  const [confirmedSteps, setConfirmedSteps] = useState([]);
  const timersRef = useRef([]);
  const ranFromUrlRef = useRef(false);

  const [searchParams] = useSearchParams();

  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const startSim = useCallback(() => {
    clearTimers();
    setSimSteps([]);
    STEPS.forEach((_, i) => {
      const t = setTimeout(() => setSimSteps((p) => [...p, STEPS[i]]), 500 + i * 720);
      timersRef.current.push(t);
    });
  }, [clearTimers]);

  const run = useCallback(async (rawValue) => {
    const target = (rawValue ?? url).trim();
    if (!target) return;
    setPhase('loading');
    setError(null);
    setErrorKind(null);
    setData(null);
    setConfirmedSteps([]);
    startSim();

    try {
      const res = await analyzeUrl.analyze(target.replace(/\/\s*$/, ''));
      const payload = res.data;

      // Queued mode (production worker fleet): poll the job to completion.
      if (payload?.queued && payload?.jobId) {
        clearTimers();
        setSimSteps([]);
        setConfirmedSteps(['Preparing your analysis\u2026']);
        await pollJob(payload.jobId, setConfirmedSteps);
        return;
      }

      clearTimers();
      setSimSteps([]);
      const steps = payload?.progress || [];
      setConfirmedSteps(steps);
      if (!payload || payload.ok === false) {
        setErrorKind(payload?.kind || null);
        setError(payload?.error || 'Could not analyze that link.');
        setPhase('error');
      } else {
        setData(payload);
        setPhase('done');
      }
    } catch (err) {
      clearTimers();
      setSimSteps([]);
      const msg =
        err?.response?.data?.error ||
        (err?.code === 'ECONNABORTED'
          ? 'Took too long — the page may be slow or blocked. Try again.'
          : 'Could not reach the analyzer. Please try again.');
      setError(msg);
      setErrorKind(err?.response?.data?.kind || null);
      setPhase('error');
    }
  }, [url, startSim, clearTimers]);

  const pollJob = useCallback(async (jobId, setSteps) => {
    const started = Date.now();
    const maxWait = 480000;
    let lastStatus = null;
    while (Date.now() - started < maxWait) {
      await new Promise((r) => setTimeout(r, 1500));
      const j = await analyzeUrl.getJob(jobId).catch(() => null);
      if (!j || !j.data) continue;
      const job = j.data;
      if (job.status !== lastStatus) {
        lastStatus = job.status;
        if (job.status === 'running') {
          if (setSteps) setSteps((p) => {
            const filtered = (p || []).filter((s) => !s.startsWith('Preparing'));
            return [...filtered, 'Analyzing your product\u2026'];
          });
        } else if (job.status === 'retrying' || (job.error && job.status !== 'done' && job.status !== 'failed')) {
          const msg = job.error && job.error.length < 120
            ? job.error
            : 'Retrying analysis\u2026';
          if (setSteps) setSteps((p) => {
            const filtered = (p || []).filter((s) => !s.startsWith('Retrying') && !s.startsWith('All ') && !s.includes('slots are busy'));
            return [...filtered, msg];
          });
        }
      }
      if (job.status === 'queued') continue;
      if (Array.isArray(job.progress) && job.progress.length) {
        if (setSteps) setSteps(job.progress); else setConfirmedSteps(job.progress);
      }
      if (job.status === 'done' && job.result) {
        const r = job.result;
        if (r && r.ok) {
          const steps = r.progress || job.progress || [];
          if (setSteps) setSteps(steps); else setConfirmedSteps(steps);
          setData(r);
          setPhase('done');
        } else {
          setErrorKind(r?.kind || null);
          setError(r?.error || 'Could not analyze that link.');
          setPhase('error');
        }
        return;
      }
      if (job.status === 'failed') {
        setErrorKind('analysis_failed');
        setError(job.error || 'Analysis failed. Please try again.');
        setPhase('error');
        return;
      }
    }
    setError('The analysis is taking unusually long. Please try again.');
    setPhase('error');
  }, []);

  // Auto-run when the page is opened with ?url=... (e.g. from the hero search).
  useEffect(() => {
    const target = (searchParams.get('url') || '').trim();
    if (target && !ranFromUrlRef.current) {
      ranFromUrlRef.current = true;
      setUrl(target);
      run(target);
    }
  }, [searchParams, run]);

  const runDemo = useCallback(() => {
    clearTimers();
    setError(null);
    setData(null);
    setConfirmedSteps([]);
    setPhase('loading');
    startSim();
    const t = setTimeout(() => {
      clearTimers();
      setSimSteps([]);
      setData(DEMO_REPORT);
      setConfirmedSteps(DEMO_REPORT.progress || []);
      setPhase('done');
    }, 600 + STEPS.length * 720);
    timersRef.current.push(t);
  }, [startSim, clearTimers]);

  return (
    <div className="shell py-10 sm:py-14">
      <PageHeader
        eyebrow="Product URL intelligence"
        title="Paste a link. Get a decision."
        description="Drop any supported product page and Ayymus crawls it — then reasons through value, risk, timing and audience before telling you buy, wait, or avoid."
      />

      {/* ---- Input bar ---- */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="mt-8">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run();
          }}
          className="card card-pad flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <div className="flex flex-1 items-center gap-3">
            <Link2 className="h-5 w-5 shrink-0 text-primary-400" />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={PLACEHOLDER}
              className="w-full bg-transparent text-[18px] text-ink-100 placeholder:text-ink-500 focus:outline-none"
              aria-label="Product URL"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-md shrink-0" disabled={phase === 'loading'}>
            {phase === 'loading' ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Analyzing…
              </>
            ) : (
              <>
                <ScanSearch className="h-4 w-4" />
                Analyze
              </>
            )}
          </button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-surface-600">
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-success" /> Deterministic numbers + AI reasoning</span>
          <span className="flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-warning" /> Dead or sparse pages fail gracefully</span>
          <button
            type="button"
            onClick={runDemo}
            disabled={phase === 'loading'}
            className="ml-auto flex items-center gap-1.5 rounded-full border border-primary-600/25 bg-primary-600/10 px-3 py-1 font-medium text-primary-300 transition-colors hover:bg-primary-600/20"
          >
            <Sparkles className="h-3.5 w-3.5" /> Try a sample report
          </button>
        </div>
      </motion.div>

      {/* ---- Idle ---- */}
      {phase === 'idle' && <EmptyIllustration onDemo={runDemo} />}

      {/* ---- Loading ---- */}
      <AnimatePresence>
        {phase === 'loading' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-8">
            <div className="card card-pad p-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600/12 border border-primary-600/25">
                <Sparkles className="h-5 w-5 animate-pulse text-primary-300" />
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold text-white">Crawling & reasoning through the data</h3>
              <p className="mt-2 text-sm text-surface-500">This usually takes a few seconds; blocked pages pause here.</p>
              <ol className="mx-auto mt-6 max-w-md space-y-2 text-left">
                {(confirmedSteps.length ? confirmedSteps : simSteps).map((s, i) => (
                  <motion.li
                    key={`${i}-${s}`}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 rounded-lg border border-line bg-surface-100 px-3 py-2 text-[12px] font-medium text-ink-300"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                    {s}
                  </motion.li>
                ))}
              </ol>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Error ---- */}
      <AnimatePresence>
        {phase === 'error' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-8">
            <div className="card p-7 border-danger/25 bg-danger/[0.04]">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger/10">
                  <AlertTriangle className="h-5 w-5 text-danger" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-[15px] font-semibold text-ink-100">That link didn't give us product data</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-400">{error}</p>
                  {errorKind === 'store_blocked' && (
                    <div className="mt-4 rounded-xl border border-warning/20 bg-warning/[0.04] px-4 py-3">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-warning">Why this happens</p>
                      <ul className="space-y-1 text-[12px] text-ink-400">
                        <li>• This store detects server-side crawling and serves an anti-bot page instead of the product</li>
                        <li>• It's not about your link — the same link works fine in a normal browser</li>
                        <li>• We don't fake data for pages we can't read honestly</li>
                      </ul>
                      <p className="mt-3 text-[12px] text-ink-500">Paste an Amazon.in product link instead, or run the sample report to see a full analysis.</p>
                    </div>
                  )}
                  {errorKind === 'sparse_page' && (
                    <div className="mt-4 rounded-xl border border-warning/20 bg-warning/[0.04] px-4 py-3">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-warning">This usually means</p>
                      <ul className="space-y-1 text-[12px] text-ink-400">
                        <li>• The product is sold out or the listing was removed</li>
                        <li>• The store is blocking automated access (a "human check" page)</li>
                        <li>• A regional / geo-blocked page you can't reach from this network</li>
                        <li>• A homepage or category page — not a specific product</li>
                      </ul>
                      <p className="mt-3 text-[12px] text-ink-500">Try the exact product link (the one you'd share), a different store, or the sample report below.</p>
                    </div>
                  )}
                  <StepsBreadcrumbs steps={confirmedSteps} />
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button onClick={() => { setPhase('idle'); setUrl(''); setConfirmedSteps([]); setErrorKind(null); }} className="btn btn-secondary btn-sm">Try another link</button>
                <button onClick={runDemo} className="btn btn-ghost btn-sm">
                  <Sparkles className="h-3.5 w-3.5 text-primary-300" /> Try a sample report
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Result ---- */}
      <AnimatePresence mode="wait">
        {phase === 'done' && data && (
          <ResultView
            key={data.resolvedUrl || data.requestedUrl}
            data={data}
            onReset={() => { setPhase('idle'); setData(null); setConfirmedSteps([]); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================= UI atoms ================= */

function EmptyIllustration({ onDemo }) {
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" className="relative mt-6 flex flex-col items-center justify-center py-20 text-center">
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="relative"
      >
        <div className="absolute inset-0 -m-10 rounded-full bg-primary-600/10 blur-3xl" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-line bg-surface-100">
          <Link2 className="h-8 w-8 text-primary-300" />
        </div>
      </motion.div>
      <h2 className="mt-8 text-2xl font-semibold tracking-tight text-white">Paste a product URL</h2>
      <p className="mt-3 max-w-md text-[14px] leading-relaxed text-surface-500">
        We'll crawl the page, read its reviews, price and specs, then hand you a full buy / wait / avoid decision — with the reasoning exposed.
      </p>
      <button onClick={onDemo} className="btn btn-ghost btn-sm mt-5">
        <Sparkles className="h-3.5 w-3.5 text-primary-300" /> No link handy? Try a sample report
      </button>
      <p className="mt-6 text-[11px] uppercase tracking-[0.14em] text-surface-600">Supported</p>
      <div className="mt-2 flex max-w-xl flex-wrap justify-center gap-1.5">
        {SUPPORTED.map((s) => (
          <span key={s} className="rounded-full border border-line px-2.5 py-1 text-[11px] font-medium capitalize text-ink-400">{s}</span>
        ))}
      </div>
    </motion.div>
  );
}

function StepsBreadcrumbs({ steps }) {
  if (!steps || steps.length === 0) return null;
  return (
    <ul className="mt-4 flex flex-wrap gap-2">
      {steps.map((s, i) => (
        <li key={i} className="rounded-full border border-line bg-surface-100 px-2.5 py-1 text-[11px] text-ink-400">{s}</li>
      ))}
    </ul>
  );
}

function ResultHeader({ data }) {
  const product = data.product || {};
  const worth = data.analytics?.worth?.score;
  const currency = product.currency || 'INR';
  const fmt = (v) => (v == null ? null : `${currency === 'INR' ? '₹' : '$'}${Math.round(v).toLocaleString('en-IN')}`);
  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show" className="card card-pad overflow-hidden">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 gap-5">
          {product.image ? (
            <img
              src={product.image}
              alt=""
              className="h-20 w-20 shrink-0 rounded-2xl border border-line bg-surface-100 object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-line bg-surface-100">
              <Link2 className="h-6 w-6 text-ink-500" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-primary-600/25 bg-primary-600/10 px-2.5 py-0.5 text-[11px] font-medium capitalize text-primary-300">
                {data.site?.label || 'Store'}
              </span>
              <button onClick={() => window.open(data.resolvedUrl, '_blank')} className="link flex items-center gap-1 text-[11px] text-ink-400">
                View source <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
            <h2 className="mt-2 text-[18px] font-semibold leading-tight tracking-tight text-ink-100">{product.title}</h2>
            <p className="mt-1 text-sm text-surface-500">
              {product.brand && <span className="mr-2 font-medium text-ink-300">{product.brand}</span>}
              {fmt(product.price)}
              {product.originalPrice > product.price && (
                <span className="ml-2 text-ink-500 line-through">{fmt(product.originalPrice)}</span>
              )}
              {product.rating != null && (
                <span className="ml-3 inline-flex items-center gap-1 text-ink-300">
                  <Star className="h-3.5 w-3.5 fill-current text-warning" /> {Number(product.rating).toFixed(1)}
                  {product.ratingCount != null && <span className="text-ink-500">· {Number(product.ratingCount).toLocaleString()} ratings</span>}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-3">
          {(worth != null || data.report?.verdict) && (
            <div className="flex shrink-0 items-center justify-center gap-6 rounded-2xl border border-line bg-surface-100 px-6 py-4">
              {worth != null && <ScoreGauge score={worth} size={96} label="Worth" />}
              {data.report?.verdict && (
                <div className="max-w-[180px]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400">Verdict</p>
                  <p className="mt-1 font-display text-xl font-semibold text-ink-100">{data.report.verdict.label || data.report.verdict.decision}</p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
                    <motion.div
                      className="h-full rounded-full bg-teal-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${data.report.verdict.confidence || 0}%` }}
                      transition={{ duration: 1, delay: 0.4 }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-ink-400">{data.report.verdict.confidence}% confidence</p>
                </div>
              )}
            </div>
          )}
          <a
            href={data.requestedUrl || data.resolvedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-sm flex items-center justify-center gap-1.5"
          >
            Shop Now <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}

function SectionCard({ icon: Icon, title, subtitle, children, className = '' }) {
  return (
    <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-40px' }} className={`card card-pad ${className}`}>
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary-600/20 bg-primary-600/10">
          <Icon className="h-4 w-4 text-primary-300" />
        </span>
        <div>
          <h3 className="font-display text-[15px] font-semibold text-ink-100">{title}</h3>
          {subtitle && <p className="text-[11px] text-ink-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </motion.div>
  );
}

function PersonaCard({ personas }) {
  const buy = personas?.shouldBuy || [];
  const avoid = personas?.shouldAvoid || [];
  return (
    <SectionCard icon={Users} title="Who this is for">
      {buy.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {buy.map((p) => (
            <span key={p.key} title={p.why} className={`pill ${bCls(p.fit)}`}>
              {PERSONA_ICONS[p.key] || '•'} {p.label}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-ink-400">Too little data to profile an audience confidently.</p>
      )}
      {avoid.length > 0 && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">Probably not for</p>
          <div className="flex flex-wrap gap-2">
            {avoid.map((p) => (
              <span key={p.key} title={p.why} className="pill verdict-avoid">
                {PERSONA_ICONS[p.key] || '•'} {p.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function bCls(fit) {
  if (fit === 'high') return 'verdict-buy';
  if (fit === 'good') return 'verdict-later';
  if (fit === 'ok') return 'verdict-wait';
  return 'verdict-avoid';
}

function SentimentCard({ sentiment }) {
  if (!sentiment) return null;
  const dims = Object.values(sentiment.dimensions || {}).filter((d) => d && d.label);
  return (
    <SectionCard icon={Star} title="How owners actually feel" subtitle="Review-derived, scored per dimension">
      {sentiment.overall && (
        <p className="mb-5 rounded-xl border border-line bg-surface-60 px-4 py-3 text-[13px] leading-relaxed text-ink-300">{sentiment.overall}</p>
      )}
      {dims.length > 0 ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {dims.map((d) => {
            const t = dimTone(d.score);
            return (
              <div key={d.key} className={`rounded-xl border px-3 py-2.5 ${t.cls}`}>
                <p className="truncate text-[11px] font-semibold text-ink-200">{d.label}</p>
                <p className="mt-0.5 font-mono text-[15px] font-semibold">{d.score ?? '—'}</p>
                <p className="mt-0.5 text-[10px] opacity-80">{t.label}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-ink-400">No review body to break down by dimension.</p>
      )}
    </SectionCard>
  );
}

function PricePanel({ price }) {
  if (!price) return null;
  return (
    <SectionCard icon={Tag} title="Price intelligence" subtitle="Estimated from the page (no history yet)">
      {price.fairnessScore != null && (
        <div className="mb-4 flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0">
            <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
              <circle cx="40" cy="40" r="34" fill="none" strokeWidth="7" className="text-line text-[#1E2127]" />
              <motion.circle
                cx="40" cy="40" r="34" fill="none" stroke="#2DD4BF" strokeWidth="7" strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: (price.fairnessScore || 0) / 100 }}
                transition={{ duration: 1, delay: 0.3 }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-mono text-[17px] font-bold text-white">{price.fairnessScore || '—'}</span>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">{price.fairnessLabel}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-surface-500">{price.bestTimeToBuy}</p>
            {price.savingsOpportunity > 0 && (
              <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
                <Tag className="h-3 w-3" /> Save {price.currency === 'INR' ? '₹' : '$'}{Math.round(price.savingsOpportunity).toLocaleString('en-IN')}
              </p>
            )}
          </div>
        </div>
      )}
      {price.notes?.length > 0 && (
        <ul className="space-y-1.5">
          {price.notes.slice(0, 3).map((n, i) => (
            <li key={i} className="text-[12px] text-ink-400">• {n}</li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function SpecsPanel({ specs }) {
  const list = specs || [];
  if (!list.length) return null;
  return (
    <SectionCard icon={FileText} title="The specs, explained" subtitle="What the numbers actually mean">
      <ul className="space-y-3">
        {list.slice(0, 5).map((s) => (
          <li key={s.key || s.rawLabel} className="rounded-xl border border-line bg-surface-60 px-3.5 py-3">
            <p className="flex items-baseline justify-between gap-3">
              <span className="text-[12px] font-semibold text-ink-200">{s.label || s.rawLabel}</span>
              <span className="font-mono text-[12px] text-ink-300">{s.value}</span>
            </p>
            {s.explanation && <p className="mt-1.5 text-[12px] leading-relaxed text-ink-400">{s.explanation}</p>}
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

const ASPECT_LABELS = {
  battery: 'Battery', camera: 'Camera', display: 'Display & screen', comfort: 'Comfort & fit',
  durability: 'Durability', performance: 'Performance', value: 'Value for money',
  build: 'Build quality', sound: 'Sound & audio', software: 'Software & connectivity',
  heating: 'Thermals', size: 'Size & weight', shipping: 'Delivery & packaging',
  support: 'Support & warranty', waterproof: 'Water resistance',
};

function aspectLabel(key) {
  return ASPECT_LABELS[key] || key;
}

function confidenceLabel(v) {
  if (v == null) return { label: 'Not enough data', cls: 'text-ink-500 border-line bg-surface-100' };
  if (v >= 70) return { label: 'High confidence', cls: 'text-success border-success/25 bg-success/[0.06]' };
  if (v >= 40) return { label: 'Medium confidence', cls: 'text-warning border-warning/25 bg-warning/[0.06]' };
  return { label: 'Low confidence', cls: 'text-danger border-danger/25 bg-danger/[0.06]' };
}

function ReviewPanel({ review }) {
  if (!review) return null;
  const hasData = review.avgRating != null || review.positive != null;
  const conf = confidenceLabel(review.confidence);
  return (
    <SectionCard icon={Star} title="Review health" subtitle="Beyond the headliner stars">
      {hasData && (
        <div className="mb-4 grid grid-cols-3 gap-2.5">
          <MiniStat label="Positive" value={review.positive != null && `${review.positive}%`} tone="text-success" />
          <MiniStat label="Negative" value={review.negative != null && `${review.negative}%`} tone="text-danger" />
          <MiniStat label="Avg /5" value={review.avgRating != null ? review.avgRating.toFixed(1) : '—'} tone="text-ink-100" />
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center gap-2 text-[12px] text-ink-400">
        {review.present && (
          <span className={`rounded-full border px-2.5 py-0.5 font-medium ${conf.cls}`}>{conf.label}</span>
        )}
        {review.total > 0 && (
          <span className="rounded-full border border-line bg-surface-100 px-2.5 py-0.5 text-ink-400">
            {review.total} reviews read
          </span>
        )}
        {review.fakeRisk != null && (
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-warning" />
            Fake-review risk {Math.round(review.fakeRisk)}%
          </span>
        )}
        {review.spamRemoved > 0 && <span>{review.spamRemoved} flagged as spam</span>}
        {review.duplicatesRemoved > 0 && <span>{review.duplicatesRemoved} duplicates removed</span>}
      </div>
      {review.starDistribution && (
        <div className="mb-5 space-y-1.5">
          {[5, 4, 3, 2, 1].map((s) => {
            const pct = review.starDistribution[`p${s}`];
            if (pct == null) return null;
            return (
              <div key={s} className="flex items-center gap-2.5">
                <span className="w-8 shrink-0 text-[11px] font-medium text-ink-400">{s}★</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                  <motion.div
                    className="h-full rounded-full bg-warning/80"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                  />
                </div>
                <span className="w-9 shrink-0 text-right font-mono text-[11px] text-ink-400">{pct}%</span>
              </div>
            );
          })}
        </div>
      )}
      <AspectBreakdown review={review} />
      <RecurringIssues issues={review.recurringIssues || []} />
      {(review.positiveQuotes?.length || review.negativeQuotes?.length) && (
        <div className="mt-5 grid gap-2.5">
          {review.positiveQuotes?.length > 0 && <QuoteList title="Happy buyers say" quotes={review.positiveQuotes} tone="success" />}
          {review.negativeQuotes?.length > 0 && <QuoteList title="Watch out" quotes={review.negativeQuotes} tone="danger" />}
        </div>
      )}
    </SectionCard>
  );
}

function AspectBreakdown({ review }) {
  const praises = (review.praises || []);
  const complaints = (review.complaints || []);
  const hasPraises = praises.length > 0 || (review.aspectSentiment && Object.values(review.aspectSentiment).some((m) => m.positivePct >= 55));
  const hasComplaints = complaints.length > 0 || (review.aspectSentiment && Object.values(review.aspectSentiment).some((m) => m.negativePct >= 50));
  if (!hasPraises && !hasComplaints) return null;
  return (
    <div className="mb-5 space-y-4">
      {hasPraises && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">What reviewers praise</p>
          <div className="space-y-1.5">
            {praises.map((p) => (
              <AspectRow key={`pr-${p.key}`} label={p.topic} pct={p.weight} count={review.aspectSentiment?.[p.key]?.count} tone="bg-success" />
            ))}
          </div>
        </div>
      )}
      {hasComplaints && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">What reviewers complain about</p>
          <div className="space-y-1.5">
            {complaints.map((c) => (
              <AspectRow key={`cmp-${c.key}`} label={c.topic} pct={c.weight} count={review.aspectSentiment?.[c.key]?.count} tone="bg-danger" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AspectRow({ label, pct, count, tone }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-32 shrink-0 truncate text-[11px] font-medium text-ink-300" title={label}>{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
        <motion.div
          className={`h-full rounded-full ${tone}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
          transition={{ duration: 0.7, delay: 0.2 }}
        />
      </div>
      <span className="w-16 shrink-0 text-right font-mono text-[11px] text-ink-400">{pct}%{count != null ? ` · ${count}` : ''}</span>
    </div>
  );
}

function RecurringIssues({ issues }) {
  if (!issues || issues.length === 0) return null;
  return (
    <div className="mb-5">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">Recurring issues</p>
      <ul className="space-y-2">
        {issues.slice(0, 4).map((iss) => (
          <li key={iss.aspect} className="rounded-xl border border-danger/20 bg-danger/[0.04] px-3.5 py-2.5">
            <p className="flex items-baseline justify-between gap-2 text-[12px] font-semibold text-ink-200">
              {iss.title}
              <span className="shrink-0 font-mono text-[11px] text-danger">{iss.percent}% of mentions</span>
            </p>
            {iss.samples?.length > 0 && (
              <ul className="mt-1.5 space-y-1">
                {iss.samples.map((s, i) => (
                  <li key={i} className="text-[11px] leading-relaxed text-ink-400">“{String(s).slice(0, 160)}”</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReviewFeed({ reviews }) {
  const [showAll, setShowAll] = useState(false);
  const list = reviews || [];
  if (!list.length) return null;
  const shown = showAll ? list : list.slice(0, 12);
  const counts = list.reduce((acc, r) => {
    acc[r.polarity || 'neutral'] = (acc[r.polarity || 'neutral'] || 0) + 1;
    return acc;
  }, {});
  return (
    <SectionCard icon={Users} title={`All reviews (${list.length})`} subtitle="The full comment slate we crawled — each tagged with its detected sentiment">
      <div className="mb-3 flex flex-wrap gap-3 text-[11px] text-ink-400">
        <span className="text-success">Positive {counts.positive || 0}</span>
        <span className="text-ink-400">Neutral {counts.neutral || 0}</span>
        <span className="text-danger">Negative {counts.negative || 0}</span>
      </div>
      <ul className="space-y-2.5">
        {shown.map((r, i) => (
          <li key={r._id || i} className="rounded-xl border border-line bg-surface-60 px-3.5 py-3">
            <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-400">
              <span className="font-medium text-ink-200">{[1, 2, 3, 4, 5].map((s) => (s <= (r.rating || 0) ? '★' : '☆')).join('')}</span>
              <span>{r.author || 'buyer'}</span>
              {r.date && <span>{String(r.date).slice(0, 10)}</span>}
              {r.verified && <span className="text-success">verified</span>}
              {Number(r.helpful) > 0 && <span>{r.helpful} helpful</span>}
            </div>
            <p className="text-[12px] leading-relaxed text-ink-300">{r.text}</p>
            {(r.polarity || r.aspects?.length > 0) && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                    r.polarity === 'positive' ? 'border-success/25 bg-success/[0.06] text-success'
                    : r.polarity === 'negative' ? 'border-danger/25 bg-danger/[0.06] text-danger'
                    : 'border-line bg-surface-100 text-ink-400'
                  }`}
                >
                  {r.polarity === 'positive' ? '✓ Positive' : r.polarity === 'negative' ? '✗ Negative' : 'Neutral'}
                </span>
                {(r.aspects || []).slice(0, 4).map((a) => (
                  <span key={a} className="rounded-full border border-line bg-surface-100 px-2 py-0.5 text-[10px] text-ink-400">
                    {aspectLabel(a)}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
      {list.length > shown.length && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 text-[12px] font-medium text-primary-300 hover:underline"
        >
          {showAll ? 'Show fewer' : `Show all ${list.length} reviews`}
        </button>
      )}
    </SectionCard>
  );
}

function QuoteList({ title, quotes, tone }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">{title}</p>
      <ul className="space-y-2">
        {quotes.map((q, i) => (
          <ExpandableQuote key={i} q={q} tone={tone} />
        ))}
      </ul>
    </div>
  );
}

function ExpandableQuote({ q, tone }) {
  const [open, setOpen] = useState(false);
  const text = String(q.comment || q.text || '');
  const preview = text.length > 160 ? `${text.slice(0, 160)}…` : text;
  const toneCls = tone === 'success' ? 'border-success/20 bg-success/[0.05]' : 'border-danger/20 bg-danger/[0.05]';
  return (
    <li className={`rounded-xl border px-3.5 py-2.5 text-[12px] leading-relaxed ${toneCls}`}>
      <p className="text-ink-300">{open ? text : preview}</p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] text-ink-500">— {q.author || 'buyer'}, {q.rating}/5</span>
        {text.length > 160 && (
          <button type="button" onClick={() => setOpen((v) => !v)} className="text-[11px] font-medium text-primary-300 hover:underline">
            {open ? 'Show less' : 'Show full review'}
          </button>
        )}
      </div>
    </li>
  );
}

function MiniStat({ label, value, tone }) {
  return (
    <div className="rounded-xl border border-line bg-surface-60 px-3 py-2.5 text-center">
      <p className="text-[10px] uppercase tracking-wider text-ink-500">{label}</p>
      <p className={`mt-0.5 font-display text-[17px] font-semibold ${tone}`}>{value ?? '—'}</p>
    </div>
  );
}

function ResultView({ data, onReset }) {
  const info = data.report?.intelligence || {};
  return (
    <div className="mt-10 space-y-6">
      {data.contentMismatch && (
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="flex items-start gap-3 rounded-2xl border border-warning/25 bg-warning/[0.06] px-4 py-3.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-warning">Possible wrong product</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-300">{data.contentMismatch.note}</p>
          </div>
        </motion.div>
      )}
      <ResultHeader data={data} />

      <AIReport report={data.report} />

      <div className="grid gap-4 lg:grid-cols-2">
        <PersonaCard personas={info.personas} />
        <PricePanel price={info.price} />
      </div>

      <SentimentCard sentiment={info.sentiment} />

      <div className="grid gap-4 lg:grid-cols-2">
        <SpecsPanel specs={info.specExplained} />
        <ReviewPanel review={info.reviewAnalysis} />
      </div>

      <ReviewFeed reviews={data.reviews} />

      <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-line bg-surface-60 px-6 py-4 sm:flex-row">
        <p className="text-[12px] text-ink-500">
          Analyzed <span className="font-medium text-ink-300">{data.site?.label || 'store'}</span>
          {data.product?.price ? ` · ${data.product.currency === 'INR' ? '₹' : '$'}${Math.round(data.product.price).toLocaleString('en-IN')}` : ''}
          {data.analytics?.worth ? ` · worth ${data.analytics.worth.score}/100` : ''}
        </p>
        <button onClick={onReset} className="btn btn-secondary btn-sm">
          <RotateCcw className="h-3.5 w-3.5" /> Analyze another
        </button>
      </motion.div>
    </div>
  );
}