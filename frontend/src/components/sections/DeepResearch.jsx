import { motion } from 'framer-motion';
import { Globe, ExternalLink, MessageSquare, Play, Newspaper, Users, Sparkles } from 'lucide-react';
import { useState } from 'react';

const BLOCKED = /amazon|flipkart|myntra|meesho|ajio|croma|reliance|tatacliq|jiomart|zepto|blinkit|instamart|swiggy|bigbasket|nykaa|lenskart|samsung\.com|apple\.com|google\.com|oneplus|realme|xiaomi|oppo|vivo|nokia\.com|motorola\.com|wikipedia|\.gov|\.edu/i;

const CATEGORIES = [
  { key: 'community', label: 'Community', icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', match: (t) => t === 'community' },
  { key: 'review', label: 'Expert Reviews', icon: Play, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', match: (t) => t === 'review' },
  { key: 'news', label: 'News & Blogs', icon: Newspaper, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', match: (t) => t === 'news' },
  { key: 'social', label: 'Social', icon: MessageSquare, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20', match: (t) => t === 'social' },
  { key: 'other', label: 'Discussions', icon: MessageSquare, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', match: (t) => t === 'other' },
];

function categorize(items) {
  if (!items) return [];
  return items.filter((r) => {
    if (r.sourceType === 'marketplace' || r.sourceType === 'brand') return false;
    const d = (r.sourceDomain || r.sourceUrl || '').toLowerCase();
    if (BLOCKED.test(d)) return false;
    return true;
  });
}

function groupByCategory(items) {
  const groups = {};
  for (const item of items) {
    const cat = CATEGORIES.find((c) => c.match(item.sourceType)) || CATEGORIES[3];
    if (!groups[cat.key]) groups[cat.key] = { ...cat, items: [] };
    groups[cat.key].items.push(item);
  }
  return Object.values(groups).filter((g) => g.items.length > 0);
}

export default function DeepResearch({ research, loading }) {
  const [expanded, setExpanded] = useState({});

  if (!research && !loading) return null;

  const filtered = categorize(research);
  const groups = groupByCategory(filtered);

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20">
          <Sparkles className="h-5 w-5 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">What People Are Saying</h3>
          <p className="text-[13px] text-white/40">From communities, reviewers, and blogs</p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-3 py-6">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400/30 border-t-indigo-400" />
          <span className="text-[13px] text-white/40">Researching across the web…</span>
        </div>
      )}

      {!loading && groups.length === 0 && (
        <p className="text-[13px] text-white/40 py-4">No research findings available yet.</p>
      )}

      {!loading && groups.length > 0 && (
        <div className="space-y-5">
          {groups.map((group) => {
            const Icon = group.icon;
            const isExpanded = expanded[group.key];
            const shown = isExpanded ? group.items : group.items.slice(0, 3);
            return (
              <div key={group.key}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-md ${group.bg} border ${group.border}`}>
                    <Icon className={`h-3.5 w-3.5 ${group.color}`} />
                  </div>
                  <span className={`text-[13px] font-semibold ${group.color}`}>{group.label}</span>
                  <span className="text-[11px] text-white/25">({group.items.length})</span>
                </div>
                <div className="space-y-2 ml-1">
                  {shown.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="rounded-xl border border-white/[0.04] bg-white/[0.015] px-4 py-3 group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium text-white/70 leading-snug">{item.sourceTitle || 'Findings'}</p>
                          <p className="mt-1 text-[12px] leading-relaxed text-white/45 line-clamp-2">{item.finding}</p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <Globe className="h-3 w-3 text-white/20" />
                            <span className="text-[11px] text-white/25">{item.sourceDomain}</span>
                          </div>
                        </div>
                        {item.sourceUrl && (
                          <a
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-white/30 opacity-0 group-hover:opacity-100 hover:bg-white/5 hover:text-white transition-all"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
                {group.items.length > 3 && (
                  <button
                    onClick={() => setExpanded((p) => ({ ...p, [group.key]: !p[group.key] }))}
                    className="mt-2 ml-9 text-[12px] font-medium text-indigo-400/70 hover:text-indigo-300 transition-colors"
                  >
                    {isExpanded ? 'Show less' : `+${group.items.length - 3} more`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
