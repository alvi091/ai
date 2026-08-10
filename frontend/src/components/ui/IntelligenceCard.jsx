import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, GitCompareArrows, Sparkles, Star } from 'lucide-react';
import { formatPrice } from '../../utils/format';
import { fadeUp } from './motion';

export default function IntelligenceCard({
  product,
  index = 0,
  onSave,
  onCompare,
  isSaved = false,
  showReason = true,
}) {
  const match = product.suitabilityScore || product.matchScore?.score || null;
  const reason = product.aiExplanation?.whyRecommended || product.reason || null;

  return (
    <motion.div
      variants={fadeUp}
      className="card card-hover group overflow-hidden flex flex-col"
    >
      <Link to={`/products/${product.id}`} className="block">
        <div className="relative aspect-[4/3] bg-surface-200 overflow-hidden m-3 mb-0 rounded-2xl">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
            loading="lazy"
          />
          {match != null && (
            <span className="absolute top-3 left-3 pill bg-base/70 backdrop-blur-sm border-line text-ink-200 !text-[11px]">
              <Sparkles className="w-3 h-3 text-accent-400" />
              {match}% match
            </span>
          )}
          <button
            onClick={(e) => {
              e.preventDefault();
              onSave?.(product.id);
            }}
            className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              isSaved
                ? 'bg-danger/15 text-danger border border-danger/30'
                : 'bg-base/60 backdrop-blur-sm text-ink-300 border border-line hover:text-danger'
            }`}
            aria-label={isSaved ? 'Remove from wishlist' : 'Save to wishlist'}
          >
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-danger' : ''}`} />
          </button>
        </div>
      </Link>

      <div className="flex flex-col flex-1 p-4">
        <div className="flex items-center gap-1.5 text-[11px] text-ink-400 font-medium mb-1.5">
          <span>{product.brand}</span>
          <span className="w-0.5 h-0.5 rounded-full bg-ink-400/60" />
          <span className="truncate">{product.category}</span>
        </div>

        <Link to={`/products/${product.id}`} className="mb-2">
          <h3 className="font-medium text-[15px] text-ink-100 leading-snug line-clamp-1 group-hover:text-accent-300 transition-colors">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-center gap-1.5 mb-3 text-[12px] text-ink-300">
          <Star className="w-3.5 h-3.5 fill-warning text-warning" />
          <span className="font-medium text-ink-200">{product.rating || '—'}</span>
          <span className="text-ink-400">({product.reviews || 0})</span>
        </div>

        <div className="mt-auto flex items-end justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-lg font-semibold text-ink-100">
              {formatPrice(product.price, product.currency)}
            </span>
            {product.originalPrice && (
              <span className="text-[13px] text-ink-400 line-through">
                {formatPrice(product.originalPrice, product.currency)}
              </span>
            )}
          </div>
          {onCompare && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onCompare(product);
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-ink-400 hover:text-accent-300 hover:bg-surface-200 transition-all"
              title="Add to comparison"
            >
              <GitCompareArrows className="w-4 h-4" />
            </button>
          )}
        </div>

        {showReason && reason && (
          <div className="mt-3 pt-3 border-t border-line flex items-start gap-1.5">
            <Sparkles className="w-3 h-3 text-accent-500 mt-0.5 shrink-0" />
            <p className="text-[11px] text-ink-400 leading-relaxed line-clamp-2">{reason}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
