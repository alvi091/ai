import { useNavigate } from 'react-router-dom';
import { useState, useCallback, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import {
  Brain, Sparkles, ArrowRight, ShieldCheck, Wand2,
} from 'lucide-react';
import PublicFooter from '../components/layout/PublicFooter';
import SectionLabel from '../components/ui/SectionLabel';
import { fadeUp, stagger } from '../lib/motion';

const STEPS = [
  { icon: Wand2, title: 'Paste', desc: 'Paste any product URL from Amazon, Flipkart, or Myntra.' },
  { icon: Brain, title: 'Analyze', desc: 'AI reads reviews, price history, and product signals in seconds.' },
  { icon: ShieldCheck, title: 'Decide', desc: 'Get a clear buy, wait, or avoid verdict with full reasoning.' },
];

export default function Landing() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const q = url.trim();
      if (!q) return;
      navigate(`/analyze?url=${encodeURIComponent(q)}`);
    },
    [navigate, url]
  );

  return (
    <div className="min-h-screen bg-surface-50 overflow-x-hidden">
      {/* ============ HERO ============ */}
      <section className="relative flex min-h-screen items-center pt-24 pb-20 sm:pb-24">
        <HeroCursorGlow />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 glow-teal" />
          <div className="absolute inset-0 grid-noise" />
          <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[720px] h-[420px] rounded-full bg-primary-700/10 blur-[140px]" />
        </div>

        <div className="relative shell text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary-600/30 bg-primary-600/10 text-[12px] font-medium text-primary-300 mb-8"
          >
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex w-full h-full rounded-full bg-primary-500 opacity-60 animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-primary-400" />
            </span>
            AI Product Research
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-[44px] leading-[1.04] sm:text-[64px] lg:text-[84px] font-semibold tracking-[-0.045em] text-white"
          >
            Should I buy this?
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-6 max-w-2xl text-[17px] sm:text-lg leading-relaxed text-surface-500"
          >
            Paste a product link and get a complete buying decision — reviews, price analysis, alternatives, and a clear verdict.
          </motion.p>

          {/* URL Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-10 max-w-2xl"
          >
            <form onSubmit={handleSubmit} className="relative">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste Amazon or Flipkart product URL..."
                className="w-full h-14 pl-5 pr-36 rounded-2xl border border-surface-300 bg-surface-100/95 text-[15px] text-white placeholder:text-surface-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 transition-all"
              />
              <button
                type="submit"
                className="absolute right-2 top-2 bottom-2 flex items-center gap-2 px-5 rounded-xl bg-primary-600 text-white text-[14px] font-semibold hover:bg-primary-500 transition-colors"
              >
                Analyze
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
            <p className="mt-4 text-[13px] text-surface-500">
              Currently supports: Amazon, Flipkart
            </p>
          </motion.div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how" className="py-24 sm:py-32 scroll-mt-24">
        <div className="shell">
          <motion.div variants={stagger(0.08)} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} className="text-center max-w-2xl mx-auto">
            <motion.div variants={fadeUp}><SectionLabel>How it works</SectionLabel></motion.div>
            <motion.h2 variants={fadeUp} className="mt-3 text-[32px] sm:text-[44px] font-semibold tracking-[-0.035em] text-white">
              Paste. Analyze. Decide.
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-[16px] text-surface-500 leading-relaxed">
              Three steps to a confident buying decision — no browsing required.
            </motion.p>
          </motion.div>

          <div className="mt-14 grid sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-60px' }}
                className="card card-pad relative overflow-hidden text-center"
              >
                <span className="absolute top-6 right-6 text-[40px] font-semibold tracking-tighter text-surface-300/40 select-none">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary-600/12 border border-primary-600/25">
                  <step.icon className="w-5 h-5 text-primary-400" />
                </span>
                <h3 className="mt-5 text-[17px] font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-surface-500">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ DECISION SHOWCASE ============ */}
      <section className="py-24 sm:py-32 bg-surface-100/30 border-y border-surface-300/60">
        <div className="shell">
          <motion.div variants={stagger(0.08)} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} className="text-center max-w-2xl mx-auto">
            <motion.div variants={fadeUp}><SectionLabel>The decision, explained</SectionLabel></motion.div>
            <motion.h2 variants={fadeUp} className="mt-3 text-[32px] sm:text-[44px] font-semibold tracking-[-0.035em] text-white">
              Not just a recommendation. A reasoning.
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-[16px] text-surface-500 leading-relaxed">
              Every verdict shows its confidence, its drivers, and its risks.
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
      <section id="cta" className="py-24 sm:py-32">
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
                Ready to decide?
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-[15px] text-surface-500 leading-relaxed">
                Paste a product link and get a complete, evidence-backed buying decision in seconds.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button onClick={() => navigate('/analyze')} className="btn-primary">
                  <Wand2 className="w-4 h-4" />
                  Analyze a product
                  <ArrowRight className="w-4 h-4" />
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
