import { motion } from 'framer-motion';
import { Cpu } from 'lucide-react';

export default function SpecExplainer({ specs }) {
  if (!specs || specs.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 border border-teal-500/20">
          <Cpu className="h-5 w-5 text-teal-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Specifications, Explained</h3>
          <p className="text-[13px] text-white/40">What the numbers actually mean</p>
        </div>
      </div>

      <div className="space-y-3">
        {specs.slice(0, 6).map((spec, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-white/[0.04] bg-white/[0.01] px-5 py-4"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] font-medium text-white/70">{spec.label || spec.rawLabel}</span>
              <span className="shrink-0 text-[12px] font-mono text-white/40">{spec.value}</span>
            </div>
            {spec.explanation && (
              <p className="mt-2 text-[12px] leading-relaxed text-white/45">{spec.explanation}</p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
