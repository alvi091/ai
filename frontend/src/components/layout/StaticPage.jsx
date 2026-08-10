import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Logo from '../ui/Logo';
import PublicFooter from './PublicFooter';
import { fadeUp } from '../../lib/motion';

export default function StaticPage({ eyebrow, title, description, children }) {
  return (
    <div className="min-h-screen bg-surface-50 flex flex-col">
      <header className="border-b border-surface-300 bg-surface-50/85 backdrop-blur-xl sticky top-0 z-30">
        <div className="shell flex items-center justify-between h-16">
          <Logo size={28} />
          <nav className="flex items-center gap-4 text-[13px] font-medium">
            <Link to="/" className="text-surface-700 hover:text-white transition-colors">Home</Link>
            <Link to="/search" className="text-surface-700 hover:text-white transition-colors">AI Search</Link>
            <Link
              to="/signup"
              className="hidden sm:inline-flex items-center gap-1.5 btn btn-primary btn-sm"
            >
              Get started <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="shell py-12 sm:py-16">
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="max-w-3xl">
            {eyebrow && (
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-primary-400">{eyebrow}</p>
            )}
            <h1 className="mt-3 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-white">{title}</h1>
            {description && (
              <p className="mt-4 text-[15px] leading-relaxed text-surface-500">{description}</p>
            )}
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.1 }} className="mt-10">
            {children}
          </motion.div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
