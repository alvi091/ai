import { motion } from 'framer-motion';
import PublicFooter from './PublicFooter';
import { fadeUp } from '../../lib/motion';

export default function StaticPage({ eyebrow, title, description, children }) {
  return (
    <div className="min-h-screen bg-surface-50 flex flex-col">
      <main className="flex-1 pt-28 pb-12 sm:pt-32 sm:pb-16">
        <div className="shell">
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
