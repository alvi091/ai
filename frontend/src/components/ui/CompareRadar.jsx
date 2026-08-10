import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, PolarRadiusAxis, Legend, Tooltip } from 'recharts';

const COLORS = ['#14B8A6', '#5EEAD4', '#A1A7B3', '#2DD4BF'];

function RadarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface-200 px-3 py-2 shadow-lift">
      <p className="text-[11px] text-ink-400 mb-1">{payload[0].payload.trait}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-xs text-ink-100">
          <span className="font-semibold" style={{ color: p.color }}>{p.name}:</span>{' '}
          {Math.round(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function CompareRadar({ data = [], height = 320 }) {
  if (!data.length) return null;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="#2A2D35" />
          <PolarAngleAxis dataKey="trait" tick={{ fontSize: 11, fill: '#A1A7B3' }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          {data.length && data[0].scores && (
            <Tooltip content={<RadarTooltip />} />
          )}
          {Object.keys(data[0]?.scores || {}).map((name, i) => (
            <Radar
              key={name}
              name={name}
              dataKey={(d) => d.scores?.[name] ?? 0}
              stroke={COLORS[i % COLORS.length]}
              fill={COLORS[i % COLORS.length]}
              fillOpacity={0.12}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
