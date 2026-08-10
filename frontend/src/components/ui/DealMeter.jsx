import { motion } from 'framer-motion';

export default function DealMeter({ verdict = 'Fair', score = 50 }) {
  const configs = {
    'Excellent Deal': { color: 'bg-green-500', textColor: 'text-green-600', width: '95%' },
    'Great Deal': { color: 'bg-green-400', textColor: 'text-green-500', width: '80%' },
    'Good Deal': { color: 'bg-blue-500', textColor: 'text-blue-600', width: '65%' },
    'Fair': { color: 'bg-yellow-400', textColor: 'text-yellow-600', width: '50%' },
    'Slightly Overpriced': { color: 'bg-orange-400', textColor: 'text-orange-600', width: '30%' },
    'Overpriced': { color: 'bg-red-500', textColor: 'text-red-600', width: '15%' },
  };

  const config = configs[verdict] || configs.Fair;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-surface-700">Deal Meter</span>
        <span className={`text-sm font-semibold ${config.textColor}`}>{verdict}</span>
      </div>
      <div className="h-2.5 bg-surface-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${config.color}`}
          initial={{ width: '0%' }}
          animate={{ width: config.width }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
