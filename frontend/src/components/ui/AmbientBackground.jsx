import { motion } from 'framer-motion';

export default function AmbientBackground({ variant = 'app', className = '' }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {/* dot grid */}
      <div className="absolute inset-0 dot-grid opacity-[0.35]" style={{ backgroundSize: '32px 32px' }} />
      <div className="absolute inset-x-0 top-0 h-[420px] glow-teal" />
      {variant === 'hero' && (
        <>
          <div className="absolute -left-32 top-32 h-96 w-96 rounded-full bg-primary/10 blur-[120px] animate-breathe" />
          <div className="absolute -right-24 top-64 h-80 w-80 rounded-full bg-primary/10 blur-[100px] animate-breathe" style={{ animationDelay: '3s' }} />
          <motion.div
            className="absolute right-[12%] top-[18%] h-2 w-2 rounded-full bg-primary-light/70"
            animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
        </>
      )}
      {variant === 'app' && (
        <div className="absolute inset-x-0 top-0 h-64 bg-primary/[0.04] blur-3xl" />
      )}
    </div>
  );
}
