import { motion } from 'framer-motion';
import { Check, X, Minus } from 'lucide-react';

export default function MatchScoreRing({ matchScore }) {
  if (!matchScore) return null;
  const { score, matched = [], missing = [] } = matchScore;

  return (
    <div className="flex items-start gap-6">
      <div className="relative w-24 h-24 shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#262656" strokeWidth="8" />
          <motion.circle
            cx="50" cy="50" r="42" fill="none" stroke="#14b8a6" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 42}
            initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 42 - (score / 100) * 2 * Math.PI * 42 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-primary-300">{score}%</span>
          <span className="text-[9px] text-surface-600">Match</span>
        </div>
      </div>
      <div className="flex-1 space-y-1.5">
        <p className="text-xs font-medium text-surface-700 mb-2">Your Requirements</p>
        {matched.map((req, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <Check className="w-3 h-3 text-green-500 shrink-0" />
            <span className="text-surface-800">{req.label || req}</span>
            <span className="text-green-500 font-medium ml-auto">Matched</span>
          </div>
        ))}
        {missing.map((req, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <X className="w-3 h-3 text-red-400 shrink-0" />
            <span className="text-surface-800">{req.label || req}</span>
            <span className="text-red-400 font-medium ml-auto">Missing</span>
          </div>
        ))}
      </div>
    </div>
  );
}
