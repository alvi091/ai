import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Minus, AlertTriangle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function ScoreGauge({ score }) {
  const color = score >= 70 ? 'text-green-500' : score >= 45 ? 'text-yellow-500' : 'text-red-500';
  const strokeColor = score >= 70 ? '#22c55e' : score >= 45 ? '#eab308' : '#ef4444';
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#262656" strokeWidth="8" />
        <circle
          cx="60" cy="60" r={radius} fill="none" stroke={strokeColor} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${color}`}>{score}</span>
        <span className="text-xs text-surface-700">/ 100</span>
      </div>
    </div>
  );
}

function TrendIcon({ trend }) {
  if (trend === 'upward') return <TrendingUp className="w-4 h-4 text-red-500" />;
  if (trend === 'downward') return <TrendingDown className="w-4 h-4 text-green-500" />;
  if (trend === 'volatile') return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
  return <Minus className="w-4 h-4 text-surface-700" />;
}

export default function WorthBuyModal({ open, onClose, analysis }) {
  if (!analysis) return null;

  const { worthScore, verdict, summary, priceTrend, priceVerdict, reviewVerdict, pros, cons, priceHistory, currentPrice, avgPrice, lowPrice, highPrice } = analysis;

  const verdictConfig = {
    worthy: { icon: ThumbsUp, label: 'Worth Buying', color: 'text-green-300', bg: 'bg-green-500/10 border-green-500/20' },
    not_worthy: { icon: ThumbsDown, label: 'Not Worth Buying', color: 'text-red-300', bg: 'bg-red-500/10 border-red-500/20' },
    mixed: { icon: AlertTriangle, label: 'Mixed - Proceed with Caution', color: 'text-yellow-300', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  };

  const vc = verdictConfig[verdict] || verdictConfig.mixed;
  const VerdictIcon = vc.icon;

  const chartData = (priceHistory || []).map((p) => ({
    date: p.date.slice(5),
    price: p.price,
  }));

  const avg = avgPrice || 0;
  const low = lowPrice || 0;
  const high = highPrice || 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-surface-100 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-surface-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-surface-100 border-b border-surface-200 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary-500/15 border border-primary-500/20 flex items-center justify-center">
                  <VerdictIcon className={`w-4 h-4 ${vc.color}`} />
                </div>
                <h2 className="text-lg font-semibold text-surface-900">AI Buy Analysis</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-surface-200 rounded-xl transition-colors">
                <X className="w-5 h-5 text-surface-700" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center gap-6">
                <ScoreGauge score={worthScore} />
                <div className="flex-1 space-y-3">
                  <div className={`px-4 py-2 rounded-xl border ${vc.bg}`}>
                    <p className={`text-sm font-semibold ${vc.color}`}>{vc.label}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-surface-200 rounded-xl px-3 py-2">
                      <p className="text-xs text-surface-700">Avg Price</p>
                      <p className="text-sm font-semibold text-surface-900">₹{avg.toLocaleString()}</p>
                    </div>
                    <div className="bg-surface-200 rounded-xl px-3 py-2">
                      <p className="text-xs text-surface-700">Lowest</p>
                      <p className="text-sm font-semibold text-green-300">₹{low.toLocaleString()}</p>
                    </div>
                    <div className="bg-surface-200 rounded-xl px-3 py-2">
                      <p className="text-xs text-surface-700">Highest</p>
                      <p className="text-sm font-semibold text-red-300">₹{high.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {summary && (
                <div className="bg-surface-200 rounded-xl p-4">
                  <p className="text-sm text-surface-800 leading-relaxed">{summary}</p>
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendIcon trend={priceTrend} />
                  <h3 className="font-medium text-surface-900 text-sm">Price History (45 days)</h3>
                  <span className="text-xs text-surface-600">Trend: {priceTrend}</span>
                </div>
                <div className="bg-surface-200 border border-surface-300 rounded-xl p-3">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262656" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
                      <YAxis domain={['dataMin - 500', 'dataMax + 500']} tick={{ fontSize: 10 }} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value) => [`₹${value.toLocaleString()}`, 'Price']}
                        contentStyle={{ borderRadius: '12px', border: '1px solid #32326b', backgroundColor: '#0f1020', color: '#f2f3f5', fontSize: '12px' }}
                      />
                      <Line type="monotone" dataKey="price" stroke="#14b8a6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {priceVerdict && (
                  <p className="text-xs text-surface-700 mt-2">{priceVerdict}</p>
                )}
              </div>

              {reviewVerdict && (
                <div>
                  <h3 className="font-medium text-surface-900 text-sm mb-2">Review Sentiment</h3>
                  <p className="text-sm text-surface-700">{reviewVerdict}</p>
                </div>
              )}

              {(pros?.length > 0 || cons?.length > 0) && (
                <div className="grid sm:grid-cols-2 gap-4">
                  {pros?.length > 0 && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-green-300 mb-2">Pros</h4>
                      <ul className="space-y-1.5">
                        {pros.map((pro, i) => (
                          <li key={i} className="text-xs text-green-200 flex items-start gap-1.5">
                            <span className="mt-0.5">✓</span>
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {cons?.length > 0 && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-red-300 mb-2">Cons</h4>
                      <ul className="space-y-1.5">
                        {cons.map((con, i) => (
                          <li key={i} className="text-xs text-red-200 flex items-start gap-1.5">
                            <span className="mt-0.5">✗</span>
                            {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
