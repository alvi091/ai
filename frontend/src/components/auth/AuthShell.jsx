import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles } from 'lucide-react';
import Logo from '../ui/Logo';
import ConfidenceRing from '../ui/ConfidenceRing';
import ScoreGauge from '../ui/ScoreGauge';
import { fadeUp, stagger } from '../ui/motion';

export default function AuthShell({ children, title, subtitle, backLabel = 'Back to home' }) {
  return (
    <div className="min-h-screen bg-base grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="hidden lg:flex relative flex-col justify-between overflow-hidden p-12 border-r border-line bg-surface-100/40">
        <div className="absolute inset-0 dot-grid" />
        <div
          className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(closest-side, rgba(15,118,110,0.25), transparent)',
            filter: 'blur(40px)',
          }}
        />

        <div className="relative">
          <Logo />
        </div>

        <motion.div variants={stagger(0.1)} initial="hidden" animate="show" className="relative max-w-md">
          <motion.div variants={fadeUp} className="eyebrow mb-4">The AI Buying Agent</motion.div>
          <motion.h2 variants={fadeUp} className="font-display text-4xl font-semibold tracking-tight text-ink-100 leading-[1.08]">
            Every purchase.
            <br />
            One clear decision.
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-5 text-ink-300 leading-relaxed text-[15px]">
            Describe what you need. We analyze thousands of signals, reason through the
            tradeoffs, and tell you exactly what to buy — and when.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-10 flex items-center gap-5">
            <div className="card p-4 animate-floaty">
              <div className="flex items-center gap-3">
                <ScoreGauge value={91} size={72} strokeWidth={7} />
                <div>
                  <p className="text-[12px] font-medium text-ink-100">Worth Score 91</p>
                  <span className="pill verdict-buy !px-2.5 !py-0.5 !text-[10px] mt-1">Buy Now</span>
                </div>
              </div>
            </div>
            <div className="card p-4 animate-floaty" style={{ animationDelay: '1.2s' }}>
              <div className="flex items-center gap-3">
                <ConfidenceRing value={88} size={60} strokeWidth={6}>
                  <span className="font-display text-[13px] font-semibold text-ink-100">88</span>
                </ConfidenceRing>
                <p className="text-[12px] text-ink-300 leading-snug">
                  Confidence across<br />1,240 signals
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" animate="show" className="relative">
          <div className="flex items-center gap-2 text-[12px] text-ink-400">
            <Sparkles className="w-3.5 h-3.5 text-accent-500" />
            Join 12,000+ people who stopped guessing.
          </div>
        </motion.div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10 min-h-screen lg:min-h-0">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="w-full max-w-md"
        >
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[13px] text-ink-400 hover:text-ink-100 transition-colors mb-10"
          >
            <ArrowLeft className="w-4 h-4" />
            {backLabel}
          </Link>

          <div className="lg:hidden mb-8">
            <Logo />
          </div>

          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-100">{title}</h1>
          <p className="mt-2 text-ink-400 text-[15px]">{subtitle}</p>

          <div className="mt-8">{children}</div>
        </motion.div>
      </div>
    </div>
  );
}
