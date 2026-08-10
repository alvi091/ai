import { motion } from 'framer-motion';

export default function RiskMeter({ riskLabel = 'Low Risk', probability = 20 }) {
  const configs = {
    'Very Low Risk': { color: 'bg-green-500', width: '20%' },
    'Low Risk': { color: 'bg-blue-500', width: '40%' },
    'Moderate Risk': { color: 'bg-yellow-400', width: '60%' },
    'High Risk': { color: 'bg-red-500', width: '85%' },
  };

  const config = configs[riskLabel] || configs['Low Risk'];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-surface-700">Risk Level</span>
        <span className={`text-sm font-semibold ${
          riskLabel.includes('Very Low') || riskLabel.includes('Low') ? 'text-green-600'
          : riskLabel.includes('Moderate') ? 'text-yellow-600'
          : 'text-red-600'
        }`}>
          {riskLabel}
        </span>
      </div>
      <div className="h-2.5 bg-surface-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${config.color}`}
          initial={{ width: '0%' }}
          animate={{ width: config.width }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
      <p className="text-xs text-surface-400">{probability}% regret probability</p>
    </div>
  );
}
