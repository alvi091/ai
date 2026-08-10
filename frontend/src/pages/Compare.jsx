import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GitCompare, Trash2, Plus, X, Search, Star, Check, Trophy, Sparkles, ArrowRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { compare, products } from '../services/api';
import { formatPrice } from '../utils/format';
import PageHeader from '../components/ui/PageHeader';
import RadarCard from '../components/ui/RadarCard';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';

const AXES = ['Value', 'Rating', 'Popularity', 'Price', 'Suitability'];

function computeSeries(products) {
  const prices = products.map((p) => Number(p.price) || 0);
  const maxReviews = Math.max(...products.map((p) => Number(p.reviews) || 0), 1);
  const minPrice = Math.min(...prices.filter((v) => v > 0), Infinity) || 1;
  const maxPrice = Math.max(...prices, minPrice + 1);

  return products.map((p) => {
    const price = Number(p.price) || 0;
    const reviews = Number(p.reviews) || 0;
    const rating = Number(p.rating) || 0;
    return {
      key: String(p.id),
      name: p.name,
      data: [
        Math.min(100, Math.round((minPrice / (price || 1)) * 100)),
        Math.min(100, Math.round((rating / 5) * 100)),
        Math.min(100, Math.round((reviews / maxReviews) * 100)),
        Math.min(100, Math.round(((maxPrice - price) / (maxPrice - minPrice || 1)) * 100)),
        Math.min(100, Math.round(Number(p.suitabilityScore) || 68)),
      ],
    };
  });
}

function winnerFor(series, axisIndex) {
  return series.reduce((best, s) => (s.data[axisIndex] > best.data[axisIndex] ? s : best), series[0]);
}

function AttributeRow({ axis, series, index }) {
  const winner = winnerFor(series, index);
  const max = Math.max(...series.map((s) => s.data[index]), 1);

  return (
    <div className="py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-soft">{axis}</span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-mute">
          winner
        </span>
      </div>
      <div className="space-y-2">
        {series.map((s) => {
          const isWinner = s.key === winner.key;
          return (
            <div key={s.key} className="flex items-center gap-3">
              <span className={`w-3 font-mono text-[11px] ${isWinner ? 'text-primary-300' : 'text-mute'}`}>
                {isWinner ? <Trophy className="h-3.5 w-3.5" /> : ''}
              </span>
              <span className={`w-24 sm:w-32 truncate text-xs ${isWinner ? 'font-medium text-heading' : 'text-mute'}`}>
                {s.name}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-elevated">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(s.data[index] / max) * 100}%` }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  className={`h-full rounded-full ${isWinner ? 'bg-primary-500' : 'bg-line'}`}
                />
              </div>
              <span className={`w-8 text-right font-mono text-xs ${isWinner ? 'font-semibold text-primary-300' : 'text-mute'}`}>
                {s.data[index]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Compare() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data: comparisonsData, isLoading } = useQuery({
    queryKey: ['comparisons'],
    queryFn: () => compare.getAll().then((r) => r.data),
  });

  const { data: searchData } = useQuery({
    queryKey: ['product-search', searchQuery],
    queryFn: () => products.getAll({ search: searchQuery, limit: 10 }).then((r) => r.data),
    enabled: searchQuery.length > 1,
  });

  const createMutation = useMutation({
    mutationFn: (data) => compare.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comparisons'] });
      setShowCreate(false);
      setSelected([]);
      setSearchQuery('');
      setSuccess('Comparison created');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: () => {
      setError('Failed to create comparison');
      setTimeout(() => setError(''), 3000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => compare.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comparisons'] });
    },
    onError: () => {
      setError('Failed to delete comparison');
      setTimeout(() => setError(''), 3000);
    },
  });

  useEffect(() => {
    const ids = searchParams.get('products');
    if (ids) {
      const idList = ids.split(',').filter(Boolean);
      if (idList.length >= 2) {
        createMutation.mutate({ productIds: idList });
        navigate('/compare', { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleProduct = (product) => {
    setSelected((prev) =>
      prev.find((p) => p.id === product.id)
        ? prev.filter((p) => p.id !== product.id)
        : prev.length < 4
          ? [...prev, product]
          : prev
    );
  };

  const searchResults = Array.isArray(searchData)
    ? searchData
    : searchData?.products || searchData?.results || [];
  const comparisons = Array.isArray(comparisonsData)
    ? comparisonsData
    : comparisonsData?.comparisons || [];

  return (
    <div>
      <PageHeader
        eyebrow="Head to head"
        icon={GitCompare}
        title="Compare"
        subtitle="Build visual head-to-heads and let the engine call the winner — no spreadsheets required."
        action={
          <button onClick={() => setShowCreate(!showCreate)} className="btn btn-primary btn-md">
            <Plus className="h-4 w-4" /> New comparison
          </button>
        }
      />

      {error && (
        <div className="mb-6 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
      )}
      {success && (
        <div className="mb-6 flex items-center gap-2 rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          <Check className="h-4 w-4" /> {success}
        </div>
      )}

      {/* Create panel */}
      {showCreate && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="card mb-10 space-y-6 p-7">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[17px] font-semibold text-heading">Select 2–4 products</h2>
                <p className="mt-1 text-xs text-mute">The engine builds the radar and picks a winner automatically.</p>
              </div>
              <span className="font-mono text-sm text-primary-300">{selected.length}/4</span>
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products to compare…"
                className="input pl-11"
              />
            </div>

            {searchQuery.length > 1 && (
              <div className="grid max-h-72 gap-2 overflow-y-auto rounded-2xl border border-line bg-elevated/40 p-2 sm:grid-cols-2">
                {searchResults.map((p) => {
                  const isIncluded = selected.find((s) => s.id === p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleProduct(p)}
                      className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition-colors ${
                        isIncluded
                          ? 'bg-primary-700/15 ring-1 ring-inset ring-primary-500/30'
                          : 'hover:bg-elevated'
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                          isIncluded ? 'border-primary-500 bg-primary-500' : 'border-line'
                        }`}
                      >
                        {isIncluded && <Check className="h-3 w-3 text-white" />}
                      </span>
                      <img src={p.image} alt="" className="h-9 w-9 shrink-0 rounded-xl border border-line object-cover" />
                      <span className="min-w-0 flex-1 truncate text-body">{p.name}</span>
                      <span className="font-mono text-xs text-mute">{formatPrice(p.price, p.currency)}</span>
                    </button>
                  );
                })}
                {searchResults.length === 0 && (
                  <p className="col-span-full py-6 text-center text-sm text-mute">No products found</p>
                )}
              </div>
            )}

            {selected.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selected.map((p) => (
                  <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full border border-primary-500/25 bg-primary-700/10 px-3 py-1.5 text-xs text-body">
                    {p.name}
                    <button onClick={() => toggleProduct(p)} aria-label={`Remove ${p.name}`}>
                      <X className="h-3.5 w-3.5 text-mute hover:text-danger" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <button
              onClick={() => createMutation.mutate({ productIds: selected.map((p) => p.id) })}
              disabled={selected.length < 2 || createMutation.isPending}
              className="btn btn-primary btn-lg w-full"
            >
              {createMutation.isPending ? 'Building comparison…' : 'Build comparison'}
            </button>
          </div>
        </motion.div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-8">
          {[1, 2].map((i) => (
            <div key={i} className="card space-y-6 p-8">
              <Skeleton className="h-6 w-56 rounded-lg" />
              <Skeleton className="h-80 w-full rounded-3xl" />
            </div>
          ))}
        </div>
      ) : comparisons.length === 0 ? (
        <EmptyState
          icon={GitCompare}
          title="No comparisons yet"
          description="Pick two products and the engine will visualize the tradeoffs, name a winner, and explain why."
          action={
            <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-md">
              <Plus className="h-4 w-4" /> Create your first
            </button>
          }
        />
      ) : (
        <div className="space-y-8">
          {comparisons.map((comp) => {
            const items = comp.products || comp.items || [];
            if (items.length < 2) return null;
            const series = computeSeries(items);
            const ai = comp.aiComparison || {};
            const verdict = ai.verdict || ai.recommendation;

            return (
              <motion.div
                key={comp.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card overflow-hidden"
              >
                <div className="flex items-center justify-between border-b border-line/70 p-6 sm:p-7">
                  <div className="min-w-0">
                    <h3 className="truncate text-[17px] font-semibold text-heading">
                      {comp.name || 'Comparison'}
                    </h3>
                    <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-mute">
                      {items.length} products
                    </p>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(comp.id)}
                    className="flex h-10 w-10 items-center justify-center rounded-2xl text-mute transition-colors hover:bg-danger/10 hover:text-danger"
                    aria-label="Delete comparison"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-10 p-6 sm:p-8 lg:grid-cols-2 lg:gap-8">
                  {/* Radar */}
                  <div>
                    <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-mute">
                      Capability map
                    </p>
                    <RadarCard series={series} axes={AXES} height={320} />
                  </div>

                  {/* Attributes */}
                  <div className="divide-y divide-line/70">
                    {AXES.map((axis, i) => (
                      <AttributeRow key={axis} axis={axis} series={series} index={i} />
                    ))}
                  </div>
                </div>

                {/* AI verdict */}
                <div className="border-t border-line/70 bg-primary-700/8 p-6 sm:p-7">
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary-400" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-primary-300">
                      AI verdict
                    </span>
                  </div>
                  {verdict ? (
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <p className="max-w-2xl text-sm leading-relaxed text-body">
                        {typeof verdict === 'string'
                          ? verdict
                          : verdict.explanation || ai.recommendation || verdict.rationale}
                      </p>
                      {verdict.winner && (
                        <span className="inline-flex items-center gap-2 rounded-full border border-primary-500/25 bg-primary-700/10 px-4 py-2 font-mono text-xs font-semibold text-primary-300">
                          <Trophy className="h-4 w-4" />
                          {verdict.winner}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed text-body">
                      Based on the capability map, <span className="font-semibold text-heading">{winnerFor(series, 1).name}</span> leads
                      on rating and value. Open each product&apos;s decision center for the full reasoning.
                    </p>
                  )}
                  <div className="mt-5 flex flex-wrap gap-2">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => navigate(`/products/${item.id}`)}
                        className="btn btn-secondary btn-sm"
                      >
                        <Star className="h-3.5 w-3.5" />
                        {item.name}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
