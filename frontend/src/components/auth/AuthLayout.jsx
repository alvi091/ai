import { motion } from 'framer-motion';
import { ArrowLeft, Brain, ShieldCheck, TrendingDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '../ui/Logo';
import { fadeUp, stagger } from '../../lib/motion';

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-surface-50 flex">
      {/* Brand panel */}
      <aside className="hidden lg:flex relative w-[46%] xl:w-1/2 flex-col justify-between overflow-hidden border-r border-surface-300">
        <div className="absolute inset-0 glow-teal" />
        <div className="absolute inset-0 grid-noise" />
        <div className="absolute -bottom-32 -left-24 w-[480px] h-[480px] rounded-full bg-primary-700/10 blur-[120px]" />

        <div className="relative p-12 xl:p-16">
          <Logo size={36} />
        </div>

        <div className="relative p-12 xl:p-16">
          <motion.div variants={stagger(0.1)} initial="hidden" animate="show" className="max-w-md">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary-600/30 bg-primary-600/10 text-[12px] font-medium text-primary-300">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
              The AI Buying Agent
            </motion.div>
            <motion.h2 variants={fadeUp} className="mt-6 text-[34px] font-semibold tracking-[-0.035em] leading-tight text-white">
              Every purchase.
              <br />
              A clear decision.
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-[15px] leading-relaxed text-surface-500">
              Ayymus remembers your preferences, tracks price intelligence, and reasons through every tradeoff — so you never second-guess a purchase again.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 space-y-4">
              {[
                { icon: Brain, text: 'Reasons through suitability, price, and timing' },
                { icon: TrendingDown, text: 'Predicts price windows before you buy' },
                { icon: ShieldCheck, text: 'Every verdict shows its confidence and risks' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary-600/12 border border-primary-600/25">
                    <Icon className="w-4 h-4 text-primary-400" />
                  </span>
                  <p className="text-[13px] text-surface-700">{text}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex-1 flex flex-col">
        <div className="p-6 flex items-center justify-between lg:justify-end">
          <Link
            to="/"
            className="lg:hidden inline-flex items-center gap-1.5 text-[13px] text-surface-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <Link
            to="/"
            className="hidden lg:inline-flex items-center gap-1.5 text-[13px] text-surface-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-5 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md"
          >
            <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-white">{title}</h1>
            {subtitle && <p className="mt-2 text-[14px] text-surface-500">{subtitle}</p>}
            <div className="mt-8">{children}</div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
