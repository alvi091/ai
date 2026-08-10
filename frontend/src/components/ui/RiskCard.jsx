import { motion } from 'framer-motion';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { fadeUp } from '../../lib/motion';
import { MeterBar } from './Gauge';

export default function RiskCard({
  probability = 0,
  level = '',
  reasons = [],
  title = 'Buyer Risk',
  className = '',
}) {
  const p = Math.min(100, Math.max(0, Number(probability) || 0));
  const lowRisk = p <= 20;
  const moderateRisk = p <= 45;

  return (
    <motion.div variants={fadeUp} className={`card card-pad ${className}`}>
      <div className="flex items-center gap-2.5 mb-4">
        <span
          className={`flex items-center justify-center w-9 h-9 rounded-xl border ${
            lowRisk
              ? 'bg-success/12 text-success border-success/25'
              : moderateRisk
                ? 'bg-warning/12 text-warning border-warning/25'
                : 'bg-danger/12 text-danger border-danger/25'
          }`}
        >
          {lowRisk ? <ShieldCheck className="w-4.5 h-4.5" /> : <ShieldAlert className="w-4.5 h-4.5" />}
        </span>
        <div>
          <h3 className="text-[15px] font-semibold text-white">{title}</h3>
          <p className="text-[12px] text-surface-500">
            {lowRisk ? 'Low risk — sensible purchase' : moderateRisk ? 'Moderate risk — weigh the tradeoffs' : 'High risk — proceed with caution'}
          </p>
        </div>
      </div>

      <MeterBar
        value={p}
        label={level || 'Regret probability'}
        display={`${p}%`}
        color={lowRisk ? '#22C55E' : moderateRisk ? '#FACC15' : '#EF4444'}
      />

      {reasons?.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-surface-300 pt-4">
          {reasons.slice(0, 4).map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-[13px] text-surface-600">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-surface-500 shrink-0" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
