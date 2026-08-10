import { motion } from 'framer-motion';
import { fadeUp, stagger } from '../../lib/motion';

export default function PageHeader({ eyebrow, title, description, actions, className = '' }) {
  return (
    <motion.div
      variants={stagger(0.06)}
      initial="hidden"
      animate="show"
      className={`flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between ${className}`}
    >
      <div className="max-w-2xl">
        {eyebrow && (
          <motion.p variants={fadeUp} className="eyebrow mb-2">
            {eyebrow}
          </motion.p>
        )}
        <motion.h1 variants={fadeUp} className="text-[30px] sm:text-[36px] font-semibold tracking-[-0.03em] text-white">
          {title}
        </motion.h1>
        {description && (
          <motion.p variants={fadeUp} className="mt-2.5 text-[15px] leading-relaxed text-surface-500">
            {description}
          </motion.p>
        )}
      </div>
      {actions && (
        <motion.div variants={fadeUp} className="flex items-center gap-3 shrink-0">
          {actions}
        </motion.div>
      )}
    </motion.div>
  );
}
