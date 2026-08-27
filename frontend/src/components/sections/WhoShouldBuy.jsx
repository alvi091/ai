import { motion } from 'framer-motion';
import { Users, UserCheck, UserX } from 'lucide-react';

export default function WhoShouldBuy({ personas }) {
  if (!personas) return null;

  const shouldBuy = personas.shouldBuy || [];
  const shouldAvoid = personas.shouldAvoid || [];

  if (shouldBuy.length === 0 && shouldAvoid.length === 0) return null;

  const PERSONA_ICONS = {
    student: '🎓', developer: '💻', gamer: '🎮', professional: '💼', travel: '✈️',
    office: '🏢', photography: '📷', fitness: '🏋️', parents: '👶', business: '🏪',
    creator: '🎬', casual: '😌',
  };

  const fitColors = {
    high: 'border-emerald-500/20 bg-emerald-500/[0.04] text-emerald-400',
    good: 'border-blue-500/20 bg-blue-500/[0.04] text-blue-400',
    ok: 'border-amber-500/20 bg-amber-500/[0.04] text-amber-400',
    low: 'border-red-500/20 bg-red-500/[0.04] text-red-400',
  };

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20">
          <Users className="h-5 w-5 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Who Should Buy This?</h3>
          <p className="text-[13px] text-white/40">Best suited for specific users</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {shouldBuy.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <UserCheck className="h-4 w-4 text-emerald-400" />
              <span className="text-[13px] font-semibold text-emerald-400">Best For</span>
            </div>
            <div className="space-y-2">
              {shouldBuy.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`rounded-xl border px-4 py-3 ${fitColors[p.fit] || fitColors.ok}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{PERSONA_ICONS[p.key] || '👤'}</span>
                    <span className="text-[13px] font-medium">{p.label}</span>
                  </div>
                  {p.why && (
                    <p className="mt-1 text-[11px] opacity-70">{p.why}</p>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {shouldAvoid.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <UserX className="h-4 w-4 text-red-400" />
              <span className="text-[13px] font-semibold text-red-400">Not Ideal For</span>
            </div>
            <div className="space-y-2">
              {shouldAvoid.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-red-500/15 bg-red-500/[0.03] px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{PERSONA_ICONS[p.key] || '👤'}</span>
                    <span className="text-[13px] font-medium text-red-400/80">{p.label}</span>
                  </div>
                  {p.why && (
                    <p className="mt-1 text-[11px] text-red-400/50">{p.why}</p>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
