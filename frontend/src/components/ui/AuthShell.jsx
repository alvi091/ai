import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles } from 'lucide-react';
import Logo from './Logo';

export default function AuthShell({ title, subtitle, children, backTo = '/' }) {
  return (
    <div className="relative flex min-h-screen bg-canvas">
      <div className="bg-grid mask-fade-b absolute inset-0 opacity-40" />

      {/* Brand panel */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden border-r border-line bg-panel/40 p-12 lg:flex">
        <div className="absolute -left-24 top-1/3 h-[420px] w-[420px] rounded-full bg-primary-700/15 blur-[120px]" />
        <Link to="/" className="relative z-10">
          <Logo size={34} />
        </Link>
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="card max-w-sm p-8"
          >
            <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-700/15 ring-1 ring-inset ring-primary-500/25">
              <Sparkles className="h-4.5 w-4.5 text-primary-400" />
            </span>
            <h2 className="text-2xl font-semibold leading-snug tracking-tight text-heading">
              Decisions over guesswork.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-soft">
              Every account comes with a personal AI buying agent that learns your preferences,
              tracks price intelligence, and explains every recommendation.
            </p>
            <div className="mt-6 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-pingSoft rounded-full bg-primary-400" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500" />
              </span>
              <span className="font-mono text-[11px] uppercase tracking-widest text-mute">
                Free to start
              </span>
            </div>
          </motion.div>
        </div>
        <p className="relative z-10 text-xs text-mute">
          © {new Date().getFullYear()} Ayymus — the AI buying agent
        </p>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-1 items-center justify-center p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md"
        >
          <Link
            to={backTo}
            className="mb-8 inline-flex items-center gap-1.5 text-sm text-mute transition-colors hover:text-soft"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>

          <div className="mb-8 flex items-center gap-4 lg:hidden">
            <Logo size={32} />
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-heading">{title}</h1>
          {subtitle && <p className="mt-2 text-[15px] text-soft">{subtitle}</p>}

          <div className="mt-9">{children}</div>
        </motion.div>
      </div>
    </div>
  );
}
