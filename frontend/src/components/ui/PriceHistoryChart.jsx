import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';

function fmt(value, currency) {
  const sym = currency === 'INR' ? '\u20B9' : '$';
  return `${sym}${Number(value).toLocaleString('en-IN')}`;
}

export default function PriceHistoryChart({ priceHistory, currency = 'USD', currentPrice }) {
  const points = Array.isArray(priceHistory) ? priceHistory : [];
  if (points.length < 2) return null;

  const data = points.map((p) => ({
    date: typeof p.date === 'string' ? p.date.slice(0, 10) : p.date,
    price: Number(p.price),
  }));

  const min = Math.min(...data.map((d) => d.price));
  const max = Math.max(...data.map((d) => d.price));
  const pad = Math.max(1, (max - min) * 0.15);
  const prices = data.map((d) => d.price);

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#262656" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
          <YAxis
            domain={[Math.floor(min - pad), Math.ceil(max + pad)]}
            tick={{ fontSize: 10 }}
            tickLine={false}
            width={70}
            tickFormatter={(v) => fmt(v, currency)}
          />
          <Tooltip
            formatter={(value) => [fmt(value, currency), 'Price']}
            labelFormatter={(label) => label}
            contentStyle={{ borderRadius: '12px', border: '1px solid #32326b', backgroundColor: '#0f1020', color: '#f2f3f5', fontSize: '12px' }}
          />
          {currentPrice != null && (
            <ReferenceLine y={Number(currentPrice)} stroke="#00d4c8" strokeDasharray="4 4" label={{ value: 'Now', position: 'insideTopRight', fontSize: 10, fill: '#00d4c8' }} />
          )}
          <Line
            type="monotone"
            dataKey="price"
            stroke="#14b8a6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            isAnimationActive={false}
            fill="#14b8a6"
            fillOpacity={0.08}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="sr-only">
        {prices.length} price points tracked, ranging from {fmt(min, currency)} to {fmt(max, currency)}
      </div>
    </div>
  );
}
