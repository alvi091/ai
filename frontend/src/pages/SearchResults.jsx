import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Search, RefreshCw, ShieldCheck, Database } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { search as searchApi } from '../services/api';
import AiSearchBar from '../components/ui/AiSearchBar';
import ProductCard from '../components/ui/ProductCard';
import ReasoningCard, { ThinkingDots } from '../components/ui/ReasoningCard';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';

import { fadeUpSm, fadeUp } from '../lib/motion';

const EXAMPLES = [
  'Running shoes for marathon training under ₹15,000 with wide toe box',
  'Noise-cancelling headphones for office, budget ₹20,000',
  'Lightweight laptop for programming and travel under ₹80,000',
  'Waterproof winter jacket for Delhi under ₹5,000',
];

const REASONING_STEPS = (q) => [
  { text: 'Understanding your intent', detail: q },
  { text: 'Scanning product catalog', detail: '10,000+ products across marketplaces' },
  { text: 'Analyzing price trends', detail: 'fair value, floor, and direction' },
  { text: 'Scoring suitability', detail: 'match against your needs' },
  { text: 'Ranking recommendations', detail: 'by combined worth' },
];

const REASON_DURATION = 1050;

export default function SearchResults() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);

  const [results, setResults] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [status, setStatus] = useState(initialQuery ? 'thinking' : 'idle'); // idle | thinking | done | error
  const [reasonStep, setReasonStep] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const runId = useRef(0);

  const steps = useMemo(() => REASONING_STEPS(submittedQuery), [submittedQuery]);

  const doSearch = useCallback(async (prompt) => {
    const id = ++runId.current;
    setQuery(prompt);
    setSubmittedQuery(prompt);
    setSearchParams({ q: prompt }, { replace: true });
    setResults([]);
    setStatus('thinking');
    setReasonStep(0);
    setConfidence(0);

    // Progressive reasoning simulation
    const stepTimer = setInterval(() => {
      setReasonStep((s) => Math.min(s + 1, steps.length));
      setConfidence((c) => Math.min(96, c + 24));
    }, REASON_DURATION);

    try {
      const res = await searchApi.search(prompt);
      const body = res.data;
      if (id !== runId.current) return;
      const list = body.results || [];
      setResults(list);
      setTotalResults(body.totalResults || list.length || 0);
      setConfidence(96);
      setReasonStep(steps.length);
      setTimeout(() => setStatus('done'), 350);
    } catch (err) {
      if (id !== runId.current) return;
      setStatus('error');
      toast.error(err?.response?.data?.message || 'The search could not be completed.');
    } finally {
      clearInterval(stepTimer);
    }
  }, [setSearchParams, steps.length]);

  // Auto-run on mount with query param
  useEffect(() => {
    if (initialQuery) doSearch(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (value) => {
    const trimmed = value.trim();
    if (!trimmed) { toast.error('Describe what you need first'); return; }
    doSearch(trimmed);
  };

  const briefing = useMemo(() => {
    if (!submittedQuery || status === 'idle') return null;
    const words = submittedQuery.split(' ');
    const budgetMatch = submittedQuery.match(/(?:under|below|less than|max|budget(?: of)?)\s*[₹$]?\s?([\d,]+(?:\.\d+)?)/i);
    const budget = budgetMatch ? Number(budgetMatch[1].replace(/,/g, '')) : null;
    return {
      intent: words.slice(0, 6).join(' ') + (words.length > 6 ? '…' : ''),
      budget,
      confidence,
    };
  }, [submittedQuery, confidence, status]);

  return (
    <div className="space-y-8">
      {/* Search bar */}
      <motion.div variants={fadeUpSm} initial="hidden" animate="show">
        <AiSearchBar
          value={query}
          onChange={setQuery}
          onSubmit={handleSubmit}
          placeholder="Describe what you need…"
          examples={status === 'idle' ? EXAMPLES : []}
          submitting={status === 'thinking'}
        />
        <p className="mt-3 text-[12px] text-surface-500 text-center">
          Currently supports: Amazon, Flipkart
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {status === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <EmptyState
              icon={Search}
              title="Start with a need, not a keyword"
              description="Ask in natural language — include budget, use case, and constraints. The AI does the rest."
              action={
                <button onClick={() => handleSubmit(EXAMPLES[0])} className="btn-secondary">
                  <Sparkles className="w-4 h-4" /> Show me an example
                </button>
              }
            />
          </motion.div>
        )}

        {status === 'thinking' && (
          <motion.div key="thinking" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 space-y-4">
              <div className="card card-pad">
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary-600/12 border border-primary-600/25">
                    <Sparkles className="w-4 h-4 text-primary-400" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-surface-500">Analyzing</p>
                    <p className="text-[14px] font-medium text-surface-800 truncate">“{submittedQuery}”</p>
                  </div>
                  <Badge tone="teal" icon={ShieldCheck}>verifying</Badge>
                </div>
                <ThinkingDots label="Cross-referencing product signals" />
              </div>

              <ReasoningCard steps={steps.map((s, i) => ({ ...s, done: i < reasonStep }))} active title="Reasoning in progress" />
            </div>

            <div className="lg:col-span-2">
              <div className="card card-pad">
                <p className="text-[13px] font-medium text-surface-500 mb-4">Decision confidence</p>
                <div className="relative">
                  <svg viewBox="0 0 120 120" className="mx-auto w-40 h-40 -rotate-90">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#1A1C21" strokeWidth="10" />
                    <motion.circle
                      cx="60" cy="60" r="50" fill="none" stroke="#14B8A6" strokeWidth="10" strokeLinecap="round"
                      pathLength={100} strokeDasharray="100"
                      animate={{ strokeDashoffset: 100 - confidence }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="tnum text-[30px] font-semibold tracking-tight text-white">{confidence}%</span>
                    <span className="text-[11px] text-surface-500">confidence</span>
                  </div>
                </div>
                <p className="mt-4 text-[12px] text-surface-500 leading-relaxed text-center">
                  Confidence rises as price, review, and suitability signals are confirmed.
                </p>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {[['Price', '~70%'], ['Reviews', 'analyzed'], ['Match', 'scored']].map(([label, val]) => (
                  <div key={label} className="rounded-2xl border border-surface-300 bg-surface-100 p-3 text-center">
                    <p className="text-[11px] text-surface-500">{label}</p>
                    <p className="mt-0.5 text-[12px] font-semibold text-surface-700">{val}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <EmptyState
              icon={RefreshCw}
              title="Search interrupted"
              description="Something went wrong while scanning. Your query is preserved — try again."
              action={
                <button onClick={() => doSearch(submittedQuery)} className="btn-primary">
                  <RefreshCw className="w-4 h-4" /> Retry
                </button>
              }
            />
          </motion.div>
        )}

        {status === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-8">

            {/* AI Briefing */}
            <motion.div variants={fadeUp} initial="hidden" animate="show" className="card card-pad overflow-hidden border-l-[3px] border-l-primary-600">
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary-600/12 border border-primary-600/25">
                      <Sparkles className="w-4 h-4 text-primary-400" />
                    </span>
                    <div>
                      <p className="text-[12px] text-surface-500 font-medium">AI Briefing</p>
                      <p className="text-[15px] font-semibold text-white">What the agent looked for</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Badge tone="teal" icon={Search}>Intent: {briefing?.intent}</Badge>
                    {briefing?.budget && <Badge tone="neutral">Budget under ₹{briefing.budget.toLocaleString('en-IN')}</Badge>}
                    <Badge tone="neutral" icon={Database}>{totalResults} candidates scanned</Badge>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <Badge tone={confidence >= 80 ? 'success' : 'warning'} dot>
                    {confidence}% confidence
                  </Badge>
                </div>
              </div>
            </motion.div>

            {/* Results */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[20px] font-semibold tracking-tight text-white">
                  Ranked results
                  <span className="ml-2 text-[14px] font-normal text-surface-500">· {totalResults} matched</span>
                </h2>
                <p className="text-[13px] text-surface-500 hidden sm:block">Ranked by combined worth score</p>
              </div>

              {results.length === 0 ? (
                <EmptyState
                  icon={Search}
                  title="No strong matches"
                  description="No product cleared the worth threshold for this query. Try adjusting the budget or wording."
                  action={
                    <button onClick={() => doSearch(query)} className="btn-secondary">
                      <RefreshCw className="w-4 h-4" /> Refine and retry
                    </button>
                  }
                />
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.map((product, i) => (
                    <motion.div
                      key={product.id || product.asin || i}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: Math.min(i * 0.06, 0.6) }}
                    >
                      <ProductCard product={product} index={i} />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
