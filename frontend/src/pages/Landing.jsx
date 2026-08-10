import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import {
  Brain, TrendingDown, ShieldCheck, Sparkles, ArrowRight, Heart, GitCompare,
  Clock, Target, Gauge, Layers, Wand2, Menu, X,
} from 'lucide-react';
import AiSearchBar from '../components/ui/AiSearchBar';
import Logo from '../components/ui/Logo';
import PublicFooter from '../components/layout/PublicFooter';
import SectionLabel from '../components/ui/SectionLabel';
import InsightCard from '../components/ui/InsightCard';
import MarketplaceBrowse from '../components/ui/MarketplaceBrowse';
import { fadeUp, fadeUpSm, stagger } from '../lib/motion';
import { useTypewriter, useMounted } from '../lib/hooks';

const EXAMPLES = [

  'Laptop for programming & travel, light, under ₹80,000',
  'Winter jacket for Delhi, waterproof, under ₹5,000',
];

const TYPING_PROMPTS = [
  '“best value 4K monitor for photo editing under ₹30,000”',
  '“noise-cancelling earbuds with good mic for calls”',
  '“lightweight backpack for daily office commute”',
];

const STEPS = [
  { icon: Wand2, title: 'Describe', desc: 'Say what you need in plain language. Budget, use case, constraints — the AI parses it all.' },
  { icon: Brain, title: 'Analyze', desc: 'Thousands of product signals are scored: reviews, price history, durability, timing, and your profile.' },
  { icon: Target, title: 'Decide', desc: 'A clear verdict with confidence. Buy now, wait, or avoid — with the reasoning exposed, not hidden.' },
  { icon: ShieldCheck, title: 'Buy', desc: 'Act on a decision backed by evidence. Every recommendation explains why, and what could go wrong.' },
];

const FEATURES = [
  { icon: Brain, title: 'AI Decision Engine', desc: 'Not a search index. An engine that reasons about suitability, value, and timing before recommending anything.' },
  { icon: Gauge, title: 'Worth Scores', desc: 'Every product gets a transparent 0–100 worth score built from reviews, price fairness, risk, and durability.' },
  { icon: TrendingDown, title: 'Price Intelligence', desc: 'Historical trends, fair-price estimates, and future predictions so you never buy at the top.' },
  { icon: Heart, title: 'Shopping Memory', desc: 'Ayymus remembers your budget, style, and preferences to personalize every single decision.' },
  { icon: GitCompare, title: 'Intelligent Comparison', desc: 'Radar-grade attribute comparison with a clear AI verdict — no spreadsheet tables.' },
  { icon: Clock, title: 'Timing Advice', desc: 'Know when to pull the trigger and when to wait. Buying windows matter, and the AI tracks them.' },
];

export default function Landing() {
  const navigate = useNavigate();
  const mounted = useMounted();
  const [query, setQuery] = useState('');
  const [promptIndex, setPromptIndex] = useState(0);
  const { output, done } = useTypewriter(TYPING_PROMPTS[promptIndex], {
    speed: 34,
    startDelay: 900,
    enabled: mounted && !query,
  });

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => {
      setPromptIndex((i) => (i + 1) % TYPING_PROMPTS.length);
    }, 2600);
    return () => clearTimeout(t);
  }, [done]);

  const handleSearch = useCallback(
    (value) => {
      const q = (value || query).trim();
      if (!q) return;
      const isUrl =
        /^https?:\/\//i.test(q) ||
        /^www\./i.test(q) ||
        (q.includes('.') && !q.includes(' '));
      if (isUrl) {
        navigate(`/analyze?url=${encodeURIComponent(q)}`);
        return;
      }
      navigate(`/search?q=${encodeURIComponent(q)}`);
    },
    [navigate, query]
  );

  const goAnalyze = useCallback(() => navigate('/analyze'), [navigate]);

  return (
    <div className="min-h-screen bg-surface-50 overflow-x-hidden">
      <PublicHeader onSearch={() => handleSearch()} onAnalyze={goAnalyze} />

      {/* ============ HERO ============ */}
      <section className="relative flex min-h-screen items-center pt-24 pb-20 sm:pb-24">  
        <HeroCursorGlow />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 glow-teal" />
          <div className="absolute inset-0 grid-noise" />
          <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[720px] h-[420px] rounded-full bg-primary-700/10 blur-[140px]" />
        </div>

        <div className="relative shell text-center">
          {/* <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary-600/30 bg-primary-600/10 text-[12px] font-medium text-primary-300 mb-8"
          >
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex w-full h-full rounded-full bg-primary-500 opacity-60 animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-primary-400" />
            </span>
            The AI Buying Agent
          </motion.div> */}

          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-[44px] leading-[1.04] sm:text-[64px] lg:text-[84px] font-semibold tracking-[-0.045em] text-white"
          >
            Shop Smarter.
            <br />
            <span className="text-teal-gradient">Buy Better.</span>
          </motion.h1>

          {/* <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-6 max-w-2xl text-[17px] sm:text-lg leading-relaxed text-surface-500"
          >
            Ayymus isn't a store. It's an AI decision engine that analyzes thousands of product signals,
            reasons through the tradeoffs, and tells you exactly what to buy — and when.
          </motion.p> */}

          {/* Floating intelligence cards */}
          <div className="relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="hidden lg:block absolute -left-8 top-6 z-20"
            >
              <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }} className="w-44 rounded-3xl border border-surface-300 bg-surface-100/95 shadow-soft p-4 text-left">
                <p className="text-[10px] text-surface-500 font-medium uppercase tracking-[0.12em]">Worth Score</p>
                <p className="mt-1 text-[26px] font-semibold tracking-tight text-white">92<span className="text-[13px] text-surface-500">/100</span></p>
                <div className="mt-2 h-1.5 rounded-full bg-surface-300 overflow-hidden">
                  <motion.div className="h-full bg-success rounded-full" initial={{ width: 0 }} animate={{ width: '92%' }} transition={{ delay: 1.2, duration: 1 }} />
                </div>
                <p className="mt-2 text-[11px] text-success">Excellent value</p>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.85, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="hidden lg:block absolute -right-6 top-2 z-20"
            >
              <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }} className="w-48 rounded-3xl border border-surface-300 bg-surface-100/95 shadow-soft p-4 text-left">
                <p className="text-[10px] text-surface-500 font-medium uppercase tracking-[0.12em]">Price Trend</p>
                <p className="mt-1 text-[24px] font-semibold tracking-tight text-success">-12.4%</p>
                <p className="text-[11px] text-surface-500">vs 45-day average</p>
                <div className="mt-2 flex items-end gap-1 h-8">
                  {[42, 38, 45, 34, 30, 26, 22, 16, 12, 9].map((h, i) => (
                    <motion.span key={i} className="flex-1 rounded-sm bg-primary-600/60" initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: 1.3 + i * 0.05, duration: 0.4 }} />
                  ))}
                </div>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="hidden lg:block absolute -left-4 -bottom-16 z-20"
            >
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1.6 }} className="w-40 rounded-3xl border border-surface-300 bg-surface-100/95 shadow-soft p-4 text-left">
                <p className="text-[10px] text-surface-500 font-medium uppercase tracking-[0.12em]">Confidence</p>
                <p className="mt-1 text-[26px] font-semibold tracking-tight text-white">88%</p>
                <div className="mt-2 flex items-center justify-center w-10 h-10 rounded-full border-2 border-primary-600/30">
                  <span className="w-6 h-6 rounded-full bg-primary-600/20" />
                </div>
              </motion.div>
            </motion.div>

            {/* AI Search */}
            <div className="mx-auto mt-12 max-w-2xl">
              <AiSearchBar
                value={query}
                onChange={setQuery}
                onSubmit={handleSearch}
                placeholder="Paste any supported product URL "
                examples={EXAMPLES}
                className="text-left"
              />

              <div className="mt-4 flex items-center justify-center gap-3 text-[13px] text-surface-500 min-h-[24px]">
                {!query && (
                  <span className="font-mono">
                    <span className="text-primary-400">{output}</span>
                    <span className="inline-block w-[7px] h-4 bg-primary-400/80 ml-0.5 animate-cursor-blink align-middle" />
                  </span> 
                )}
              </div>

              

              
            </div>
          </div>
        </div>
      </section>

      {/* ============ SIGNAL STRIP ============ */}
      <section className="border-y border-surface-300 bg-surface-100/50">
        <div className="shell py-8">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-[13px] font-medium text-surface-500">
            <span className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary-500" /> Interprets intent</span>
            <span className="flex items-center gap-2"><Brain className="w-4 h-4 text-primary-500" /> Reasons before it recommends</span>
            <span className="flex items-center gap-2"><Gauge className="w-4 h-4 text-primary-500" /> Transparent scores</span>
          </div>
        </div>
      </section>

                 {/* ============ BROWSE MARKETPLACE ============ */}
      {/* <MarketplaceBrowse /> */}

      {/* ============ HOW IT WORKS ============ */}
      <section id="how" className="py-24 sm:py-32 scroll-mt-24">
        <div className="shell">
          <motion.div variants={stagger(0.08)} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} className="max-w-2xl">
            <motion.div variants={fadeUp}><SectionLabel>How it works</SectionLabel></motion.div>
            <motion.h2 variants={fadeUp} className="mt-3 text-[32px] sm:text-[44px] font-semibold tracking-[-0.035em] text-white">
              From question to confident decision in four moves.
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-[16px] text-surface-500 leading-relaxed">
              Everything is transparent. You can see the reasoning, the data, and the tradeoffs behind every call.
            </motion.p>
          </motion.div>

          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-60px' }}
                className="card card-pad relative overflow-hidden"
              >
                <span className="absolute top-6 right-6 text-[40px] font-semibold tracking-tighter text-surface-300/40 select-none">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-600/12 border border-primary-600/25">
                  <step.icon className="w-5 h-5 text-primary-400" />
                </span>
                <h3 className="mt-5 text-[17px] font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-surface-500">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      {/* <section id="features" className="py-24 sm:py-32 bg-surface-100/50 border-y border-surface-300/60 scroll-mt-24">
        <div className="shell">
          <motion.div variants={stagger(0.08)} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} className="max-w-2xl">
            <motion.div variants={fadeUp}><SectionLabel>The intelligence stack</SectionLabel></motion.div>
            <motion.h2 variants={fadeUp} className="mt-3 text-[32px] sm:text-[44px] font-semibold tracking-[-0.035em] text-white">
              Built for decisions, not browsing.
            </motion.h2>
          </motion.div>

          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} transition={{ delay: (i % 3) * 0.06 }}>
                <InsightCard icon={f.icon} title={f.title}>
                  <p>{f.desc}</p>
                </InsightCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section> */}


      {/* ============ DECISION SHOWCASE ============ */}
      <section className="py-24 sm:py-32">
        <div className="shell">
          <motion.div variants={stagger(0.08)} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} className="text-center max-w-2xl mx-auto">
            <motion.div variants={fadeUp}><SectionLabel>The decision, explained</SectionLabel></motion.div>
            <motion.h2 variants={fadeUp} className="mt-3 text-[32px] sm:text-[44px] font-semibold tracking-[-0.035em] text-white">
              Not just a recommendation. A reasoning.
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-[16px] text-surface-500 leading-relaxed">
              Every verdict shows its confidence, its drivers, and its risks. This is what makes Ayymus an AI decision platform.
            </motion.p>
          </motion.div>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            className="mx-auto mt-14 max-w-3xl"
          >
            <div className="card card-pad overflow-hidden border-l-[3px] border-l-success">
              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="flex items-center justify-center w-10 h-10 rounded-2xl border border-success/25 bg-success/12">
                      <Sparkles className="w-5 h-5 text-success" />
                    </span>
                    <div>
                      <p className="text-[12px] text-surface-500 font-medium">AI Verdict · Sony WH-1000XM5</p>
                      <h3 className="text-[22px] font-semibold tracking-tight text-white">Buy Now</h3>
                    </div>
                  </div>
                  <p className="mt-4 text-[14px] leading-relaxed text-surface-600">
                    Rating 4.7/5 across 18,400 reviews, price at a 45-day low, and the trend turning upward.
                    Historically this pattern rewards acting now — waiting costs more than it saves.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex px-3 py-1.5 rounded-full border border-success/25 bg-success/12 text-[12px] font-medium text-success">Price at floor</span>
                    <span className="inline-flex px-3 py-1.5 rounded-full border border-success/25 bg-success/12 text-[12px] font-medium text-success">Outstanding rating</span>
                    <span className="inline-flex px-3 py-1.5 rounded-full border border-warning/25 bg-warning/12 text-[12px] font-medium text-warning">Review spread wide</span>
                  </div>
                </div>
                <div className="flex items-center justify-center shrink-0">
                  <div className="relative inline-flex items-center justify-center w-[120px] h-[120px]">
                    <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
                      <circle cx="50" cy="50" r="44" fill="none" stroke="#1A1C21" strokeWidth="9" />
                      <motion.circle
                        cx="50" cy="50" r="44" fill="none" stroke="#22C55E" strokeWidth="9" strokeLinecap="round"
                        pathLength={100} strokeDasharray="100"
                        initial={{ strokeDashoffset: 100 }}
                        whileInView={{ strokeDashoffset: 12 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                      />
                    </svg>
                    <div className="text-center">
                      <p className="text-[24px] font-semibold tracking-tight text-white">88%</p>
                      <p className="text-[10px] text-surface-500">confidence</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

 

      {/* ============ CTA ============ */}
      <section className="pb-28">
        <div className="shell">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            className="relative card card-pad overflow-hidden text-center py-16 sm:py-20"
          >
            <div className="absolute inset-0 glow-teal pointer-events-none" />
            <div className="relative">
              <h2 className="text-[30px] sm:text-[40px] font-semibold tracking-[-0.035em] text-white">
                Ready for your next decision?
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-[15px] text-surface-500 leading-relaxed">
                Describe what you need and get a complete, evidence-backed buying decision in seconds — or paste the link of a product you're already eyeing.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button onClick={goAnalyze} className="btn-primary">
                  <Wand2 className="w-4 h-4" />
                  Analyze any product URL
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={() => handleSearch()} className="btn-secondary">
                  Start an intelligent search
                </button>
                <button onClick={() => navigate('/signup')} className="btn-secondary">
                  Create a free account
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

function HeroCursorGlow() {
  const ref = useRef(null);
  const mx = useMotionValue(-400);
  const my = useMotionValue(-400);
  const x = useSpring(mx, { stiffness: 60, damping: 20, mass: 0.6 });
  const y = useSpring(my, { stiffness: 60, damping: 20, mass: 0.6 });

  const onMove = useCallback((e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set(e.clientX - rect.left);
    my.set(e.clientY - rect.top);
  }, [mx, my]);

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className="absolute inset-0 hidden lg:block pointer-events-none"
      aria-hidden="true"
    >
      <motion.div
        style={{ x, y }}
        className="absolute -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] rounded-full"
      >
        <div
          className="w-full h-full rounded-full"
          style={{
            background:
              'radial-gradient(closest-side, rgba(15,118,110,0.14), rgba(20,184,166,0.04) 55%, transparent)',
            filter: 'blur(30px)',
          }}
        />
      </motion.div>
    </div>
  );
}

function PublicHeader({ onSearch, onAnalyze }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollTo = (id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="mx-auto max-w-[1440px] px-3 sm:px-8 lg:px-12">
        <div className="mt-4 flex items-center justify-between gap-2 h-14 px-3 sm:px-4 rounded-2xl border border-surface-300/70 bg-surface-100/80 backdrop-blur-xl">
          <Logo size={26} />
          <div className="hidden md:flex items-center gap-1">
            <button onClick={() => scrollTo('how')} className="px-4 py-2 rounded-xl text-[13px] font-medium text-surface-600 hover:text-white hover:bg-surface-200 transition-all">
              How it works
            </button>
            
            <button onClick={onAnalyze} className="px-4 py-2 rounded-xl text-[13px] font-medium text-surface-600 hover:text-white hover:bg-surface-200 transition-all">
              Analyze link
            </button>
           
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/login')} className="hidden sm:inline-flex px-4 py-2 rounded-xl text-[13px] font-medium text-surface-600 hover:text-white hover:bg-surface-200 transition-all">
              Sign in
            </button>
            <button onClick={() => navigate('/signup')} className="hidden md:inline-flex btn btn-sm btn-primary">
              Get started
            </button>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl text-surface-600 hover:text-white hover:bg-surface-200 transition-all"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="md:hidden mt-2 rounded-2xl border border-surface-300 bg-surface-100/95 backdrop-blur-xl overflow-hidden shadow-lift"
            >
              <div className="p-2 flex flex-col">
                {[
                  { label: 'How it works', id: 'how' },
                  { label: 'Intelligence', id: 'features' },
                  { label: 'Marketplace', id: 'marketplace' },
                ].map(({ label, id }) => (
                  <button
                    key={id}
                    onClick={() => scrollTo(id)}
                    className="px-4 py-3 rounded-xl text-left text-[14px] font-medium text-surface-700 hover:text-white hover:bg-surface-200 transition-all"
                  >
                    {label}
                  </button>
                ))}
                <button
                  onClick={() => { setMenuOpen(false); onAnalyze(); }}
                  className="px-4 py-3 rounded-xl text-left text-[14px] font-medium text-primary-400 hover:bg-surface-200 transition-all"
                >
                  Analyze a product URL
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onSearch(); }}
                  className="px-4 py-3 rounded-xl text-left text-[14px] font-medium text-primary-400 hover:bg-surface-200 transition-all"
                >
                  Try it
                </button>
                <div className="mt-1 pt-2 border-t border-surface-300 flex items-center gap-2">
                  <button
                    onClick={() => { setMenuOpen(false); navigate('/login'); }}
                    className="flex-1 px-4 py-2.5 rounded-xl text-[14px] font-medium text-surface-600 hover:text-white hover:bg-surface-200 transition-all"
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); navigate('/signup'); }}
                    className="flex-1 btn btn-sm btn-primary"
                  >
                    Get started
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
