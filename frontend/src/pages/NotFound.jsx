import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Compass, ArrowLeft } from 'lucide-react';
import Logo from '../components/ui/Logo';
import { LogoMark } from '../components/ui/Logo';
import { fadeUp } from '../components/ui/motion';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 dot-grid" />
      <div
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(closest-side, rgba(15,118,110,0.22), transparent)', filter: 'blur(40px)' }}
      />
      <div className="relative flex flex-col items-center text-center max-w-md">
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="mb-8">
          <div className="w-16 h-16 rounded-3xl bg-surface-200 border border-line flex items-center justify-center mx-auto mb-8">
            <Compass className="w-7 h-7 text-accent-400" strokeWidth={1.5} />
          </div>
          <p className="font-display text-7xl font-semibold tracking-tight text-ink-100">404</p>
          <h1 className="font-display text-2xl font-semibold text-ink-100 mt-4 mb-2">
            This signal doesn't exist.
          </h1>
          <p className="text-ink-400 text-[15px] leading-relaxed">
            The page you're looking for wasn't found — even the engine couldn't reason its way here.
          </p>
        </motion.div>
        <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.1 }} className="flex flex-col sm:flex-row gap-3">
          <Link to="/" className="btn-primary">
            <ArrowLeft className="w-4 h-4" />
            Back home
          </Link>
          <Link to="/search" className="btn-secondary">
            Ask the engine
          </Link>
        </motion.div>
        <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.2 }} className="mt-12">
          <Logo />
        </motion.div>
      </div>
    </div>
  );
}
