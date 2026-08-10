import { motion } from 'framer-motion';

export default function SuitabilityBreakdown({ breakdown = [] }) {
  if (!breakdown || breakdown.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-surface-700">Score Breakdown</h4>
      <div className="space-y-2">
        {breakdown.map((item, i) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="space-y-1"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="text-surface-600">{item.name}</span>
              <span className="font-medium text-surface-700">{item.score}%</span>
            </div>
            <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-primary-400"
                initial={{ width: '0%' }}
                animate={{ width: `${item.score}%` }}
                transition={{ duration: 0.8, delay: i * 0.05, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
