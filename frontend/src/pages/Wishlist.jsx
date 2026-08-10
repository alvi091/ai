import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Trash2, Star, ArrowUpRight, Sparkles, TrendingDown } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wishlist } from '../services/api';
import { formatPrice } from '../utils/format';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonCard } from '../components/ui/Skeleton';

function itemSignals(product) {
  const rating = Number(product.rating) || 0;
  const worth = product.suitabilityScore || Math.round(rating * 20) || 62;
  const price = Number(product.price) || 0;
  const original = Number(product.originalPrice) || 0;
  const discount = original > price ? Math.round((1 - price / original) * 100) : 0;
  let status = 'Watch';
  let tone = '#FACC15';
  if (rating >= 4.5) { status = 'Strong buy'; tone = '#22C55E'; }
  else if (rating >= 4.0) { status = 'Solid pick'; tone = '#5EEAD4'; }
  else if (rating >= 3.5) { status = 'Consider'; tone = '#FACC15'; }
  else { status = 'Avoid'; tone = '#EF4444'; }
  return { worth, discount, status, tone };
}

export default function Wishlist() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => wishlist.getAll().then((r) => r.data),
  });

  const removeMutation = useMutation({
    mutationFn: (id) => wishlist.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
  });

  const items = Array.isArray(data) ? data : data?.wishlist || data?.items || [];

  return (
    <div>
      <PageHeader
        eyebrow="Saved for later"
        icon={Heart}
        title="Wishlist"
        subtitle="The engine watches these for you — tracking price, value, and the right moment to strike."
        action={
          <span className="rounded-full border border-line bg-elevated px-4 py-2 font-mono text-sm text-soft">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        }
      />

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : isError ? (
        <EmptyState
          icon={Heart}
          title="Couldn't load your wishlist"
          description="Try again in a moment."
          action={
            <button onClick={() => queryClient.invalidateQueries({ queryKey: ['wishlist'] })} className="btn btn-primary btn-md">
              Retry
            </button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Nothing saved yet"
          description="Save products you're weighing up — the engine will track their value and nudge you at the right time."
          action={
            <Link to="/search" className="btn btn-primary btn-md">
              <Sparkles className="h-4 w-4" /> Run an AI search
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => {
            const product = item.product || item;
            const sig = itemSignals(product);
            return (
              <motion.div
                key={item.id || product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
                className="card card-hover group relative overflow-hidden"
              >
                <button
                  onClick={() => removeMutation.mutate(item.id)}
                  disabled={removeMutation.isPending}
                  aria-label="Remove from wishlist"
                  className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-canvas/70 text-mute backdrop-blur transition-colors hover:border-danger/40 hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <button onClick={() => navigate(`/products/${product.id}`)} className="block w-full text-left">
                  <div className="aspect-[4/3] overflow-hidden bg-elevated">
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                  </div>

                  <div className="p-5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-widest text-mute">
                        {product.brand}
                      </span>
                      <span
                        className="rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest"
                        style={{ color: sig.tone, borderColor: `${sig.tone}40`, background: `${sig.tone}12` }}
                      >
                        {sig.status}
                      </span>
                    </div>

                    <p className="line-clamp-1 text-[15px] font-semibold text-heading">{product.name}</p>

                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="font-mono text-lg font-semibold text-heading">
                        {formatPrice(product.price, product.currency)}
                      </span>
                      {product.originalPrice && (
                        <span className="font-mono text-xs text-mute line-through">
                          {formatPrice(product.originalPrice, product.currency)}
                        </span>
                      )}
                      {product.rating != null && (
                        <span className="ml-auto flex items-center gap-1 text-xs text-mute">
                          <Star className="h-3 w-3 fill-primary-400 text-primary-400" />
                          {product.rating}
                        </span>
                      )}
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line/70 pt-5">
                      <div>
                        <p className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-mute">
                          <Sparkles className="h-3 w-3 text-primary-400" /> Worth
                        </p>
                        <p className="mt-1 font-mono text-base font-semibold text-primary-300">
                          {sig.worth}/100
                        </p>
                      </div>
                      <div>
                        <p className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-mute">
                          <TrendingDown className="h-3 w-3 text-primary-400" /> Potential saving
                        </p>
                        <p className="mt-1 font-mono text-base font-semibold text-success">
                          up to {sig.discount || 12}%
                        </p>
                      </div>
                    </div>

                    <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-primary-400 opacity-0 transition-opacity group-hover:opacity-100">
                      Open decision center <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
