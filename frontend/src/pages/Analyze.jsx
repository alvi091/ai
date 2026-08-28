import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link2, ScanSearch, Sparkles, AlertTriangle, ArrowUpRight, Star,
  RotateCcw, CheckCircle2, Globe, Store, MessageCircle,
} from 'lucide-react';
import { analyzeUrl, research } from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import BuyingDecision from '../components/sections/BuyingDecision';
import ReviewIntelligence from '../components/sections/ReviewIntelligence';
import PriceValue from '../components/sections/PriceValue';
import MarketplaceComparison from '../components/sections/MarketplaceComparison';
import DeepResearch from '../components/sections/DeepResearch';
import CommonProblems from '../components/sections/CommonProblems';
import ReviewsList from '../components/sections/ReviewsList';
import SpecExplainer from '../components/sections/SpecExplainer';
import ProductChat from '../components/ProductChat';

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

const PLACEHOLDER = 'Paste any product URL — Amazon or Flipkart...';
const SUPPORTED = ['Amazon', 'Flipkart'];

export default function Analyze() {
  const [url, setUrl] = useState('');
  const [phase, setPhase] = useState('idle');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [errorKind, setErrorKind] = useState(null);
  const [simSteps, setSimSteps] = useState([]);
  const [confirmedSteps, setConfirmedSteps] = useState([]);
  const [marketplaceData, setMarketplaceData] = useState(null);
  const [researchData, setResearchData] = useState(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const [problemsData, setProblemsData] = useState(null);
  const [alternativesData, setAlternativesData] = useState(null);
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

  const startBackgroundResearch = useCallback(async (analysisData) => {
    setResearchLoading(true);
    try {
      const product = analysisData.product || {};
      const price = product.price || analysisData.analytics?.price?.current || null;

      const res = await research.analyze({
        productUrl: analysisData.resolvedUrl || analysisData.requestedUrl,
        productName: product.title || product.name,
        brand: product.brand,
        category: product.category,
        price,
        rating: product.rating,
        ratingCount: product.ratingCount || product.reviews_count,
        reviews: (analysisData.reviews || []).slice(0, 30),
        siteLabel: analysisData.site?.label,
      });

      if (res.data?.ok) {
        setResearchData(res.data.findings);
        setProblemsData(res.data.problems);
        setAlternativesData(res.data.alternatives);
        setMarketplaceData(res.data.marketplace);
      }
    } catch (err) {
      console.error('[research] background error:', err?.message || err);
    } finally {
      setResearchLoading(false);
    }
  }, []);

  const run = useCallback(async (rawValue) => {
    const target = (rawValue ?? url).trim();
    if (!target) return;
    setPhase('loading');
    setError(null);
    setErrorKind(null);
    setData(null);
    setConfirmedSteps([]);
    setMarketplaceData(null);
    setResearchData(null);
    setProblemsData(null);
    setAlternativesData(null);
    startSim();

    try {
      const res = await analyzeUrl.analyze(target.replace(/\/\s*$/, ''));
      const payload = res.data;

      if (payload?.queued && payload?.jobId) {
        clearTimers();
        setSimSteps([]);
        setConfirmedSteps(['Preparing your analysis…']);
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
        setUrl('');
      } else {
        setData(payload);
        setPhase('done');
        setUrl('');
        startBackgroundResearch(payload);
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
  }, [url, startSim, clearTimers, startBackgroundResearch]);

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
            return [...filtered, 'Analyzing your product…'];
          });
        } else if (job.status === 'retrying' || (job.error && job.status !== 'done' && job.status !== 'failed')) {
          const msg = job.error && job.error.length < 120 ? job.error : 'Retrying analysis…';
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
          startBackgroundResearch(r);
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
  }, [startBackgroundResearch]);

  useEffect(() => {
    const target = (searchParams.get('url') || '').trim();
    if (target && !ranFromUrlRef.current) {
      ranFromUrlRef.current = true;
      setUrl(target);
      run(target);
    }
  }, [searchParams, run]);

  return (
    <div className="min-h-screen bg-[#080A0F]">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 sm:py-16">
        <PageHeader
          eyebrow="AI Product Research"
          title="Should I buy this?"
          description="Paste a product link and Ayymus will research it — reviews, price, alternatives, common problems — and tell you buy, wait, or avoid."
        />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8"
        >
          <form
            onSubmit={(e) => { e.preventDefault(); run(); }}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-3">
                <Link2 className="h-5 w-5 shrink-0 text-teal-400" />
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={PLACEHOLDER}
                  className="w-full bg-transparent text-[17px] text-white placeholder:text-white/25 focus:outline-none"
                  aria-label="Product URL"
                />
              </div>
              <button
                type="submit"
                className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-40 transition-colors shrink-0"
                disabled={phase === 'loading'}
              >
                {phase === 'loading' ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Researching…
                  </>
                ) : (
                  <>
                    <ScanSearch className="h-4 w-4" />
                    Research
                  </>
                )}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-white/25">
              <span>Supported: {SUPPORTED.join(' · ')}</span>
            </div>
          </form>
        </motion.div>

        {phase === 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-16 flex flex-col items-center text-center"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/[0.06] bg-white/[0.02]">
              <Link2 className="h-8 w-8 text-teal-400/60" />
            </div>
            <h2 className="mt-8 text-2xl font-semibold text-white">Paste a product URL</h2>
            <p className="mt-3 max-w-md text-[14px] leading-relaxed text-white/40">
              Ayymus will crawl the page, read its reviews and price, then hand you a full buy / wait / avoid decision — with the reasoning exposed.
            </p>
          </motion.div>
        )}

        <AnimatePresence>
          {phase === 'loading' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-8"
            >
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 border border-teal-500/20">
                  <Sparkles className="h-5 w-5 animate-pulse text-teal-400" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-white">Researching this product</h3>
                <p className="mt-2 text-sm text-white/40">This usually takes a few seconds…</p>
                <ol className="mx-auto mt-6 max-w-md space-y-2 text-left">
                  {(confirmedSteps.length ? confirmedSteps : simSteps).map((s, i) => (
                    <motion.li
                      key={`${i}-${s}`}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[12px] font-medium text-white/60"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-teal-400" />
                      {s}
                    </motion.li>
                  ))}
                </ol>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {phase === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-8"
            >
              <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-7">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold text-white">That link didn't work</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-white/50">{error}</p>
                    {errorKind === 'store_blocked' && (
                      <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-4 py-3">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-400">Why this happens</p>
                        <ul className="space-y-1 text-[12px] text-white/40">
                          <li>• This store detects server-side crawling and serves an anti-bot page</li>
                          <li>• The same link works fine in a normal browser</li>
                          <li>• We don't fake data for pages we can't read honestly</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-5 flex gap-3">
                  <button onClick={() => { setPhase('idle'); setUrl(''); setConfirmedSteps([]); setErrorKind(null); }} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 hover:bg-white/10 transition-colors">
                    Try another link
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {phase === 'done' && data && (
            <motion.div
              key={data.resolvedUrl || data.requestedUrl}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-10 space-y-6"
            >
              <ProductHeader data={data} />

              <BuyingDecision
                report={data.report}
                analytics={data.analytics}
                personas={data.report?.intelligence?.personas}
                marketplace={marketplaceData}
              />

              <div className="grid gap-6 lg:grid-cols-2">
                <ReviewIntelligence
                  reviewAnalysis={data.report?.intelligence?.reviewAnalysis}
                  sentiment={data.report?.intelligence?.sentiment}
                />
                <PriceValue
                  priceInsight={data.report?.intelligence?.price}
                  analytics={data.analytics}
                />
              </div>

              {/* <MarketplaceComparison comparisons={marketplaceData} />

              <ReviewsList reviews={data.reviews} /> */}

              <DeepResearch research={researchData} loading={researchLoading} />

              <CommonProblems
                reviewComplaints={data.report?.intelligence?.reviewAnalysis?.complaints}
                reviews={data.reviews}
              />

              <SpecExplainer specs={data.report?.intelligence?.specExplained} />

              <SourcesList data={data} />

              <div className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-4">
                <p className="text-[12px] text-white/30">
                  Analyzed {data.site?.label || 'store'}
                  {data.product?.price ? ` · ₹${Math.round(data.product.price).toLocaleString('en-IN')}` : ''}
                </p>
                <button
                  onClick={() => { setPhase('idle'); setData(null); setConfirmedSteps([]); }}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/60 hover:bg-white/10 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Analyze another
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* {phase === 'done' && data && <ProductChat analysis={data} />} */}
    </div>
  );
}

function ProductHeader({ data }) {
  const product = data.product || {};
  const currency = product.currency || 'INR';
  const fmt = (v) => v == null ? null : `₹${Math.round(v).toLocaleString('en-IN')}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 gap-5">
          {product.image ? (
            <img
              src={product.image}
              alt=""
              className="h-20 w-20 shrink-0 rounded-2xl border border-white/[0.06] bg-white/[0.02] object-cover"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              <Link2 className="h-6 w-6 text-white/20" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-teal-500/20 bg-teal-500/10 px-2.5 py-0.5 text-[11px] font-medium text-teal-400">
                {data.site?.label || 'Store'}
              </span>
              <button onClick={() => window.open(data.resolvedUrl, '_blank')} className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-colors">
                View source <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
            <h2 className="mt-2 text-[18px] font-semibold leading-tight text-white">{product.title}</h2>
            <p className="mt-1 text-sm text-white/40">
              {product.brand && <span className="mr-2 font-medium text-white/60">{product.brand}</span>}
              {fmt(product.price)}
              {product.originalPrice > product.price && (
                <span className="ml-2 text-white/25 line-through">{fmt(product.originalPrice)}</span>
              )}
              {product.rating != null && (
                <span className="ml-3 inline-flex items-center gap-1 text-white/50">
                  <Star className="h-3.5 w-3.5 fill-current text-amber-400" /> {Number(product.rating).toFixed(1)}
                  {product.ratingCount != null && <span className="text-white/30">· {Number(product.ratingCount).toLocaleString()}</span>}
                </span>
              )}
            </p>
          </div>
        </div>

        <a
          href={data.requestedUrl || data.resolvedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-500 transition-colors"
        >
          Shop Now <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </motion.div>
  );
}

function SourcesList({ data }) {
  const report = data.report;
  if (!report?.meta?.dataSources) return null;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
      <div className="flex items-center gap-2 mb-3">
        <Globe className="h-4 w-4 text-white/30" />
        <span className="text-[12px] font-semibold uppercase tracking-wider text-white/30">Data Sources</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {report.meta.dataSources.map((s, i) => (
          <span key={i} className="rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1 text-[11px] text-white/35">
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
