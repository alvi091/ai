import {
  RadarChart as RC, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer,
} from 'recharts';

const PALETTE = ['#14B8A6', '#22C55E', '#FACC15', '#EF4444'];

export default function RadarChart({ data = [], series = [], height = 320 }) {
  if (!data.length) return null;

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RC data={data} cx="50%" cy="52%" outerRadius="72%">
          <PolarGrid stroke="#2A2D35" />
          <PolarAngleAxis dataKey="axis" tick={{ fill: '#A1A7B3', fontSize: 12 }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#6E7480', fontSize: 10 }} axisLine={false} tickCount={5} />
          {series.map((s, i) => (
            <Radar
              key={s.key || s.name}
              name={s.name}
              dataKey={s.key || s.name}
              stroke={s.color || PALETTE[i % PALETTE.length]}
              fill={s.color || PALETTE[i % PALETTE.length]}
              fillOpacity={0.12}
              strokeWidth={2}
              animationDuration={1200}
            />
          ))}
          <Legend wrapperStyle={{ fontSize: 12, color: '#D7DBE3' }} iconType="circle" iconSize={8} />
        </RC>
      </ResponsiveContainer>
    </div>
  );
}
