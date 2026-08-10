import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { formatPrice } from '../../utils/format';

function ChartTooltip({ active, payload, label, currency, currentPrice }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-line bg-elevated px-4 py-3 shadow-lift">
      <p className="font-mono text-[10px] uppercase tracking-widest text-mute">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-heading">
        {formatPrice(payload[0].value, currency)}
      </p>
      {currentPrice != null && (
        <p className="mt-0.5 text-[11px] text-soft">Now {formatPrice(currentPrice, currency)}</p>
      )}
    </div>
  );
}

export default function PriceTrendChart({
  data = [],
  currency,
  currentPrice,
  height = 220,
  tone = '#14B8A6',
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <filter id="dotShadow" x="-200%" y="-200%" width="400%" height="400%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={tone} floodOpacity="0.45" />
            </filter>
          </defs>
          <CartesianGrid stroke="#1E2127" strokeDasharray="3 6" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: '#6E7480', fontSize: 11, fontFamily: 'JetBrains Mono' }}
            tickLine={false}
            axisLine={{ stroke: '#1E2127' }}
            minTickGap={28}
          />
          <YAxis
            tick={{ fill: '#6E7480', fontSize: 11, fontFamily: 'JetBrains Mono' }}
            tickLine={false}
            axisLine={false}
            width={52}
            domain={['dataMin - 40', 'dataMax + 40']}
            tickFormatter={(v) => formatPrice(v, currency)}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={tone}
            strokeWidth={2.25}
            fill={tone}
            fillOpacity={0.08}
            dot={false}
            activeDot={{ r: 5, fill: tone, stroke: '#0A0A0B', strokeWidth: 3, filter: 'url(#dotShadow)' }}
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
