import { motion } from 'framer-motion';
import { Calendar, TrendingDown, TrendingUp, DollarSign, Clock } from 'lucide-react';

export default function ProductTimeline({ lifecycle }) {
  if (!lifecycle || !lifecycle.releaseDate) return null;

  const events = [
    { date: new Date(lifecycle.releaseDate), label: 'Released', icon: Calendar },
    { date: null, label: 'Current Price', icon: DollarSign, highlight: true },
    { date: lifecycle.expectedSuccessor ? new Date(Date.now() + 180 * 86400000) : null, label: 'Best Time to Buy', icon: TrendingDown },
    { date: lifecycle.expectedSuccessor ? new Date(Date.now() + 365 * 86400000) : null, label: 'Replacement Expected', icon: Clock },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-glass p-5"
    >
      <h3 className="text-sm font-semibold text-surface-700 mb-4">Product Timeline</h3>
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-surface-200" />
        <div className="space-y-4">
          {events.filter(e => e.date || e.highlight).map((event, i) => {
            const Icon = event.icon;
            return (
              <div key={i} className="relative flex items-start gap-4 pl-10">
                <div className={`absolute left-2.5 w-3 h-3 rounded-full -translate-x-1/2 mt-1.5 ${
                  event.highlight ? 'bg-primary-500 ring-4 ring-primary-100' : 'bg-surface-300'
                }`} />
                <div className={`flex-1 ${event.highlight ? 'bg-primary-50 rounded-xl p-3' : ''}`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`w-3.5 h-3.5 ${event.highlight ? 'text-primary-500' : 'text-surface-400'}`} />
                    <span className="text-xs font-medium text-surface-500">{event.label}</span>
                  </div>
                  <p className="text-sm font-semibold text-surface-700 mt-0.5">
                    {event.highlight ? 'Now — Best opportunity' : event.date?.toLocaleDateString() || '—'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-surface-100">
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium ${
          lifecycle.recommendation === 'buy' ? 'bg-green-50 text-green-700'
          : lifecycle.recommendation === 'wait' ? 'bg-yellow-50 text-yellow-700'
          : 'bg-red-50 text-red-700'
        }`}>
          {lifecycle.recommendationLabel}
        </span>
      </div>
    </motion.div>
  );
}
