import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Package, Star, DollarSign } from 'lucide-react';
import { formatPrice } from '../../utils/format';

export default function AccessoryRecommendations({ accessories, currency }) {
  if (!accessories) return null;

  const tiers = [
    { key: 'mustHave', label: 'Must Have', color: 'text-blue-600', bg: 'bg-blue-50' },
    { key: 'budget', label: 'Budget', color: 'text-green-600', bg: 'bg-green-50' },
    { key: 'premium', label: 'Premium', color: 'text-primary-600', bg: 'bg-primary-50' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-glass p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Package className="w-5 h-5 text-primary-500" />
        <h3 className="text-sm font-semibold text-surface-700">Accessories</h3>
      </div>

      <div className="space-y-4">
        {tiers.map(({ key, label, color, bg }) => {
          const items = accessories[key] || [];
          if (items.length === 0) return null;
          return (
            <div key={key}>
              <p className={`text-xs font-semibold ${color} mb-2`}>{label}</p>
              <div className="space-y-2">
                {items.filter(i => i.product).map((item, i) => (
                  <Link key={i} to={`/products/${item.product.id}`}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-50 transition-colors">
                    <img src={item.product.image} alt={item.product.name}
                      className="w-10 h-10 rounded-lg object-cover bg-surface-100" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-700 truncate">{item.product.name}</p>
                      <p className="text-xs text-surface-400">{item.product.brand}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-surface-900">{formatPrice(item.product.price, currency)}</p>
                      {item.product.rating && (
                        <div className="flex items-center gap-0.5 justify-end">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs text-surface-400">{item.product.rating}</span>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
