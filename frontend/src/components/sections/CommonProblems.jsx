import { motion } from 'framer-motion';
import { AlertTriangle, MessageCircleWarning } from 'lucide-react';

const KW = [
  'battery', 'drain', 'heat', 'hot', 'slow', 'lag', 'bug', 'crash', 'issue', 'problem',
  'poor', 'bad', 'worst', 'disappoint', 'fail', 'broken', 'defect', 'refund', 'fake', 'cheap',
  'crack', 'scratch', 'noise', 'blur', 'overheat', 'charging', 'storage', 'limited', 'heavy',
  'bulky', 'weight', 'grip', 'durability', 'signal', 'wifi', 'bluetooth', 'camera', 'speaker',
  'sound', 'volume', 'display', 'screen', 'touch', 'fingerprint', 'software', 'update',
  'bloatware', 'ads', 'warranty', 'service', 'delivery', 'missing', 'wrong', 'defective',
];

function extractConcerns(reviews) {
  if (!reviews || !Array.isArray(reviews)) return [];
  const concerns = [];
  for (const r of reviews) {
    const rating = r.rating || 0;
    const isNeg = rating <= 2 || r.polarity === 'negative';
    if (!isNeg) continue;
    const sentences = String(r.text || '').split(/[.!?]+/).filter((s) => s.trim().length > 15);
    for (const sentence of sentences) {
      const s = sentence.toLowerCase();
      if (KW.some((k) => s.includes(k)) || isNeg) {
        const t = sentence.trim();
        if (t.length > 20 && t.length < 200 && !concerns.some((c) => c.text === t)) {
          concerns.push({ text: t, author: r.author || 'Buyer', rating });
        }
      }
    }
  }
  return concerns.slice(0, 6);
}

export default function CommonProblems({ reviewComplaints, reviews }) {
  const reviewConcerns = extractConcerns(reviews || reviewComplaints);
  if (reviewConcerns.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Things to Know Before Buying</h3>
          <p className="text-[13px] text-white/40">
            {reviewConcerns.length > 0
              ? `${reviewConcerns.length} concerns from real buyers`
              : 'Known issues from research'}
          </p>
        </div>
      </div>

      {reviewConcerns.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircleWarning className="h-4 w-4 text-amber-400" />
            <span className="text-[13px] font-semibold text-amber-400">Buyers Reported</span>
          </div>
          <div className="space-y-2">
            {reviewConcerns.map((c, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-xl border border-amber-500/15 bg-amber-500/[0.03] px-4 py-3"
              >
                <p className="text-[13px] leading-relaxed text-white/60">&ldquo;{c.text}&rdquo;</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-[11px] text-white/30">{c.author}</span>
                  {c.rating > 0 && (
                    <span className="text-[11px] text-amber-400/60">
                      {'★'.repeat(Math.min(c.rating, 5))} {c.rating}/5
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
