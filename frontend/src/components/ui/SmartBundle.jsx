import { motion } from 'framer-motion';
import { Package, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatPrice } from '../../utils/format';
import Skeleton from './Skeleton';

const TIER_STYLES = {
  budgetProduct: { label: 'Budget', color: '#A1A7B3' },
  bestValueProduct: { label: 'Best value', color: '#5EEAD4' },
  premiumProduct: { label: 'Premium', color: '#14B8A6' },
};

export default function SmartBundle({ bundle, isLoading, currency }) {
  if (isLoading) {
    return (
      <div className="card space-y-5 p-7">
        <Skeleton className="h-6 w-48 rounded-lg" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!bundle || !bundle.items || bundle.items.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mb-5 flex items-center gap-2.5">
        <Package className="h-4 w-4 text-primary-400" />
        <h2 className="text-xl font-semibold tracking-tight text-heading">{bundle.title}</h2>
      </div>

      <div className="card divide-y divide-line/70 overflow-hidden">
        {bundle.items.map((item, i) => (
          <div key={item.name} className="grid gap-5 p-6 sm:grid-cols-[1.2fr_2fr] sm:items-center">
            <div>
              <p className="text-[15px] font-semibold text-heading">{item.name}</p>
              <p className="mt-0.5 font-mono text-[11px] uppercase tracking-widest text-mute">
                {item.role}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(TIER_STYLES).map(([key, tier]) => {
                const product = item[key];
                return (
                  <div
                    key={key}
                    className="flex flex-col items-center rounded-2xl border border-line bg-elevated/50 p-3 text-center"
                  >
                    <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: tier.color }}>
                      {tier.label}
                    </span>
                    {product ? (
                      <Link to={`/products/${product.id}`} className="mt-2 block w-full">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="mx-auto h-12 w-12 rounded-xl border border-line object-cover"
                        />
                        <p className="mt-2 font-mono text-xs font-semibold text-heading">
                          {formatPrice(product.price, currency)}
                        </p>
                        {product.rating && (
                          <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-mute">
                            <Star className="h-2.5 w-2.5 fill-primary-400 text-primary-400" />
                            {product.rating}
                          </span>
                        )}
                      </Link>
                    ) : (
                      <p className="mt-2 text-[11px] text-mute">—</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="grid grid-cols-3 divide-x divide-line/70 bg-elevated/30">
          {Object.entries(TIER_STYLES).map(([key, tier]) => (
            <div key={key} className="p-3 sm:p-5 text-center">
              <p className="font-mono text-sm sm:text-base font-semibold text-heading truncate px-1">
                {formatPrice(bundle[`total${key[0].toUpperCase()}${key.slice(1)}`], currency)}
              </p>
              <p className="mt-1 text-[11px] text-mute">{tier.label} total</p>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
