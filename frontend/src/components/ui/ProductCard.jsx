import { Link } from 'react-router-dom';
import { Heart, Star, Sparkles, BarChart3 } from 'lucide-react';
import { formatPrice } from '../../utils/format';
import Badge from './Badge';

function worthBadgeTone(score) {
  if (score >= 80) return 'success';
  if (score >= 60) return 'teal';
  if (score >= 40) return 'warning';
  return 'neutral';
}

export default function ProductCard({
  product,
  index = 0,
  onSave,
  onCompare,
  isSaved = false,
  showExplanation = true,
}) {
  if (!product) return null;
  const p = product.product || product;
  const score = p.suitabilityScore ?? p.matchScore?.score ?? p.worthScore;
  const explanation = p.aiExplanation?.whyRecommended || p.aiExplanation || p.aiSummary;
  const discount = p.originalPrice ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;

  return (
    <div className="card card-hover group overflow-hidden flex flex-col">
      <Link to={`/products/${p.id}`} className="block relative aspect-[4/3] overflow-hidden bg-surface-200">
        <img
          src={p.image}
          alt={p.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="absolute top-3 left-3">
          {score != null ? (
            <Badge tone={worthBadgeTone(score)} dot>
              Worth {score}
            </Badge>
          ) : (
            <Badge tone="neutral">{p.brand}</Badge>
          )}
        </div>

        {onSave && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onSave?.(p.id);
            }}
            aria-label={isSaved ? 'Remove from wishlist' : 'Save to wishlist'}
            className={`absolute top-3 right-3 flex items-center justify-center w-9 h-9 rounded-2xl backdrop-blur-md border transition-all duration-300 ${
              isSaved
                ? 'bg-danger/90 border-danger text-white'
                : 'bg-black/30 border-white/15 text-white/80 hover:bg-black/50 hover:text-white'
            }`}
          >
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-white' : ''}`} />
          </button>
        )}
      </Link>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center gap-2 text-[12px] text-surface-500">
          <span className="font-medium text-surface-700">{p.brand}</span>
          <span className="w-1 h-1 rounded-full bg-surface-500" />
          <span>{p.category}</span>
          {p.marketplace && (
            <span className="ml-auto px-2 py-0.5 rounded-md bg-surface-200 text-surface-700 border border-surface-300 font-medium">
              {p.marketplace}
            </span>
          )}
        </div>

        <Link to={`/products/${p.id}`}>
          <h3 className="mt-1.5 text-[15px] font-semibold leading-snug text-white line-clamp-2 group-hover:text-primary-hover transition-colors">
            {p.name}
          </h3>
        </Link>

        <div className="mt-2 flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 fill-warning text-warning" />
          <span className="tnum text-[13px] font-semibold text-surface-800">{p.rating || '—'}</span>
          {p.reviews != null && <span className="text-[12px] text-surface-500">({p.reviews})</span>}
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="tnum text-[18px] font-semibold text-white">
            {formatPrice(p.price, p.currency)}
          </span>
          {discount > 0 && (
            <>
              <span className="tnum text-[13px] text-surface-500 line-through">
                {formatPrice(p.originalPrice, p.currency)}
              </span>
              <span className="tnum text-[12px] font-semibold text-success">-{discount}%</span>
            </>
          )}
        </div>

        {showExplanation && explanation && (
          <div className="mt-3 pt-3 border-t border-surface-300">
            <div className="flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary-400 mt-0.5 shrink-0" />
              <p className="text-[12px] text-surface-500 leading-relaxed line-clamp-2">
                {typeof explanation === 'string' ? explanation : 'Why this product: see full analysis'}
              </p>
            </div>
          </div>
        )}

        <div className="mt-auto pt-3">
          {onCompare ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                onCompare?.(p);
              }}
              className="w-full flex items-center justify-center gap-1.5 h-9 rounded-xl border border-surface-300 text-[13px] font-medium text-surface-700 hover:text-primary-hover hover:border-primary-600/50 hover:bg-primary-600/8 transition-all"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Compare
            </button>
          ) : (
            <Link
              to={`/products/${p.id}`}
              className="w-full flex items-center justify-center gap-1.5 h-9 rounded-xl bg-surface-200 text-[13px] font-medium text-surface-800 hover:text-white hover:bg-surface-300 transition-all"
            >
              Open decision
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
