import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, LogIn } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from './Button';

export default function GuestBanner({ title, subtitle, className = '' }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={`relative overflow-hidden rounded-3xl border border-primary-500/30 bg-gradient-to-br from-primary-700/20 via-surface-200/40 to-transparent ${className}`}
    >
      <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-primary-600/20 blur-[80px] pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-500/40 to-transparent" />

      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 p-5 sm:p-6">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex items-center justify-center w-11 h-11 shrink-0 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-900 border border-primary-500/40 shadow-[0_8px_20px_-6px_rgba(15,118,110,0.6)]">
            <Sparkles className="w-5 h-5 text-primary-200" />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-white">
              {title || 'Sign in to unlock your decision dashboard'}
            </p>
            <p className="mt-0.5 text-[13px] text-surface-500">
              {subtitle ||
                'Save searches, track price intelligence, and get personalized verdicts for everything you explore.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-1.5 text-[13px] font-medium text-primary-400 hover:text-primary-300 transition-colors"
          >
            <LogIn className="w-4 h-4" />
            Sign in
          </button>
          <Button size="md" onClick={() => navigate('/dashboard')}>
            Get started free
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
