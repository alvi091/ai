import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const DEFAULT_AXES = ['Value', 'Quality', 'Performance', 'Features', 'Design', 'Support'];

function RadarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-line bg-elevated px-4 py-3 shadow-lift">
      <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-mute">
        {payload[0].payload.axis}
      </p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2 text-xs">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: entry.stroke || entry.fill }}
            />
            <span className="text-soft">{entry.name}</span>
            <span className="ml-auto font-mono font-semibold text-heading">
              {Math.round(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RadarCard({ series = [], axes = DEFAULT_AXES, height = 300 }) {
  if (!series.length) return null;

  const palette = ['#14B8A6', '#5EEAD4', '#A1A7B3', '#6E7480'];
  const data = axes.map((axis, i) => {
    const point = { axis };
    series.forEach((s, j) => {
      const raw = Array.isArray(s.data) ? s.data[i] : s.data?.[axis];
      point[s.key] = Number(raw ?? s.data?.[i] ?? 0) || 0;
    });
    return point;
  });

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="68%">
          <PolarGrid stroke="#1E2127" />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: '#6E7480', fontSize: 11 }}
            tickLine={false}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          {series.map((s, i) => (
            <Radar
              key={s.key}
              name={s.name}
              dataKey={s.key}
              stroke={palette[i % palette.length]}
              fill={palette[i % palette.length]}
              fillOpacity={0.08}
              strokeWidth={1.75}
              isAnimationActive
              animationDuration={1100}
            />
          ))}
          <Tooltip content={<RadarTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
