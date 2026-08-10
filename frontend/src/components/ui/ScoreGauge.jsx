import { motion } from 'framer-motion';

const RADIUS = 52;
const CX = 64;
const CY = 62;
const SWEEP = 240;
const ARC_LEN = (SWEEP / 360) * 2 * Math.PI * RADIUS;

const polar = (angleDeg) => {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + RADIUS * Math.cos(a), y: CY + RADIUS * Math.sin(a) };
};

const p1 = polar(150);
const p2 = polar(150 - SWEEP);
const arcPath = `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${RADIUS} ${RADIUS} 0 1 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;

export function toneFor(score) {
  if (score >= 80) return { stroke: '#22C55E', text: '#22C55E', label: 'Excellent' };
  if (score >= 70) return { stroke: '#14B8A6', text: '#5EEAD4', label: 'Strong' };
  if (score >= 55) return { stroke: '#5EEAD4', text: '#5EEAD4', label: 'Good' };
  if (score >= 40) return { stroke: '#FACC15', text: '#FACC15', label: 'Average' };
  return { stroke: '#EF4444', text: '#EF4444', label: 'Weak' };
}

export default function ScoreGauge({
  score = 0,
  size = 128,
  label = 'Worth Score',
  toneLabel = true,
}) {
  const clamped = Math.min(100, Math.max(0, Number(score) || 0));
  const tone = toneFor(clamped);
  const offset = ARC_LEN * (1 - clamped / 100);

  return (
    <div className="inline-flex flex-col items-center" style={{ width: size }}>
      <div className="relative" style={{ width: size, height: size * 0.62 }}>
        <svg width={size} height={size * 0.62} viewBox="0 0 128 80" fill="none" className="block">
          <path d={arcPath} stroke="#1E2127" strokeWidth="7" strokeLinecap="round" />
          <motion.path
            d={arcPath}
            stroke={tone.stroke}
            strokeWidth="7"
            strokeLinecap="round"
            initial={{ strokeDasharray: ARC_LEN, strokeDashoffset: ARC_LEN }}
            animate={{ strokeDasharray: ARC_LEN, strokeDashoffset: offset }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="font-mono font-semibold tracking-tight"
            style={{ color: tone.text, fontSize: size * 0.21 }}
          >
            {clamped}
            <span className="ml-1 font-medium text-mute" style={{ fontSize: size * 0.1 }}>
              /100
            </span>
          </motion.div>
        </div>
      </div>
      <div className="mt-2 text-center leading-tight">
        <span className="block text-[11px] font-mono uppercase tracking-widest text-mute">
          {label}
        </span>
        {toneLabel && (
          <span className="block text-[13px] font-semibold mt-0.5" style={{ color: tone.text }}>
            {tone.label}
          </span>
        )}
      </div>
    </div>
  );
}
