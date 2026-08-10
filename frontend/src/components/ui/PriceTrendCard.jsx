import { motion } from 'framer-motion';
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import { TrendingDown, TrendingUp, Minus, ArrowUpRight } from 'lucide-react';
import { formatPrice } from '../../utils/format';
import { fadeUp } from '../../lib/motion';
import Badge from './Badge';

export default function PriceTrendCard({
  points = [],
  currentPrice,
  fairPrice,
  lowest,
  highest,
  currency = 'INR',
  trend,
  predictedPrice,
  className = '',
}) {
  const data = (Array.isArray(points) ? points : []).map((p) => ({
    date: typeof p.date === 'string' ? p.date.slice(5) : p.date,
    price: Number(p.price),
  }));

  const dir = String(trend?.direction || '').toLowerCase();
  const dirConfig =
    dir === 'downward'
      ? { icon: TrendingDown, tone: 'success', label: 'Trending down' }
      : dir === 'upward'
        ? { icon: TrendingUp, tone: 'danger', label: 'Trending up' }
        : { icon: Minus, tone: 'neutral', label: 'Stable' };

  const DirIcon = dirConfig.icon;
  const prediction = Number(predictedPrice);

  return (
    <motion.div variants={fadeUp} className={`card card-pad ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[13px] text-surface-500 font-medium">Price Intelligence</p>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="tnum text-[28px] font-semibold tracking-tight text-white">
              {formatPrice(currentPrice ?? 0, currency)}
            </span>
            {fairPrice != null && (
              <span className="text-[13px] text-surface-500">fair ≈ {formatPrice(fairPrice, currency)}</span>
            )}
          </div>
        </div>
        {trend && (
          <Badge tone={dirConfig.tone} icon={DirIcon}>
            {dirConfig.label}
          </Badge>
        )}
      </div>

      <div className="mt-4 h-28">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#14B8A6" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#14B8A6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis hide domain={['dataMin - 40', 'dataMax + 40']} />
            <Tooltip
              cursor={{ stroke: '#2A2D35', strokeWidth: 1 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="rounded-xl border border-surface-300 bg-surface-200 px-3 py-2 shadow-soft">
                    <p className="text-[11px] text-surface-500">{payload[0].payload.date}</p>
                    <p className="tnum text-[13px] font-semibold text-white">
                      {formatPrice(payload[0].value, currency)}
                    </p>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#14B8A6"
              strokeWidth={2}
              fill="url(#priceFill)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {(lowest != null || highest != null || prediction != null) && (
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-surface-300 pt-4">
          <div>
            <p className="text-[11px] text-surface-500">Lowest</p>
            <p className="tnum text-[14px] font-semibold text-white mt-0.5">{formatPrice(lowest, currency)}</p>
          </div>
          <div>
            <p className="text-[11px] text-surface-500">Highest</p>
            <p className="tnum text-[14px] font-semibold text-white mt-0.5">{formatPrice(highest, currency)}</p>
          </div>
          <div>
            <p className="text-[11px] text-surface-500 flex items-center gap-1">
              Prediction <ArrowUpRight className="w-3 h-3" />
            </p>
            <p className="tnum text-[14px] font-semibold text-primary-400 mt-0.5">
              {formatPrice(prediction, currency)}
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
