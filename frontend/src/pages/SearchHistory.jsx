import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock3, Trash2, Search, Sparkles, ArrowUpRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { search } from '../services/api';
import EmptyState from '../components/ui/EmptyState';
import { fadeUp, stagger } from '../components/ui/motion';

function groupByDay(entries) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = 86400000;
  const groups = [];
  const label = (ts) => {
    if (ts >= startOfToday) return 'Today';
    if (ts >= startOfToday - day) return 'Yesterday';
    if (ts >= startOfToday - 7 * day) return 'This week';
    return 'Earlier';
  };
  const map = new Map();
  for (const e of entries) {
    const t = new Date(e.createdAt || e.date).getTime();
    const key = label(t);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(e);
  }
  const order = ['Today', 'Yesterday', 'This week', 'Earlier'];
  for (const o of order) if (map.has(o)) groups.push({ label: o, items: map.get(o) });
  return groups;
}

export default function SearchHistory() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['search-history'],
    queryFn: () => search.getHistory().then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => search.deleteHistory(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['search-history'] }),
    onError: () => {
      setError('Failed to delete entry');
      setTimeout(() => setError(''), 3000);
    },
  });

  const history = Array.isArray(data) ? data : data?.history || data?.results || [];
  const groups = useMemo(() => groupByDay(history), [history]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="shimmer h-10 w-56 rounded-lg" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-5 space-y-3">
            <div className="shimmer h-5 w-3/4 rounded-lg" />
            <div className="shimmer h-3 w-1/2 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-2xl mx-auto text-center py-24">
        <p className="text-ink-400 text-lg mb-6">Failed to load your history.</p>
        <button onClick={() => queryClient.invalidateQueries({ queryKey: ['search-history'] })} className="btn-primary">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <div className="eyebrow mb-2">Your conversations</div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-ink-100">Search history</h1>
        <p className="mt-2 text-ink-400 text-[15px]">{history.length} searches in total</p>
      </motion.div>

      {error && (
        <div className="rounded-2xl border border-danger/30 bg-danger/10 text-danger px-4 py-3 text-sm">{error}</div>
      )}

      {history.length === 0 ? (
        <EmptyState
          icon={Clock3}
          title="No conversations yet"
          description="Every request you make to the buying agent will appear here, ready to revisit."
          action={
            <Link to="/search" className="btn-primary">
              <Sparkles className="w-4 h-4" />
              Ask your first question
            </Link>
          }
        />
      ) : (
        <motion.div variants={stagger(0.07)} initial="hidden" animate="show" className="space-y-10">
          {groups.map((group) => (
            <div key={group.label}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-400">{group.label}</span>
                <span className="flex-1 h-px bg-line" />
                <span className="text-[11px] text-ink-400">{group.items.length}</span>
              </div>
              <div className="space-y-2.5">
                {group.items.map((entry, idx) => (
                  <motion.div
                    key={entry.id || idx}
                    variants={fadeUp}
                    className="card p-4 sm:p-5 flex items-start gap-4 group"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-surface-200 border border-line flex items-center justify-center shrink-0 mt-0.5">
                      <Search className="w-4 h-4 text-accent-400" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => navigate(`/search?q=${encodeURIComponent(entry.prompt || entry.query)}`)}
                        className="text-left text-[15px] font-medium text-ink-100 leading-snug group-hover:text-accent-300 transition-colors line-clamp-1"
                      >
                        {entry.prompt || entry.query}
                      </button>
                      {entry.intent && (
                        <p className="text-[12px] text-ink-400 mt-1">
                          <span className="font-medium text-ink-300">Intent:</span> {entry.intent}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {entry.createdAt && (
                          <span className="text-[11px] text-ink-400">
                            {new Date(entry.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        {entry.category && <span className="chip !text-[10px]">{entry.category}</span>}
                        {entry.results && <span className="chip !text-[10px]">Results saved</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => navigate(`/search?q=${encodeURIComponent(entry.prompt || entry.query)}`)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-ink-400 hover:text-accent-300 hover:bg-surface-200 transition-colors"
                        title="Repeat search"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(entry.id)}
                        disabled={deleteMutation.isPending}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-ink-400 hover:text-danger hover:bg-danger/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
