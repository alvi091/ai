import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { admin } from '../services/api';
import { Users, ShoppingBag, Search, BarChart3, TrendingUp, Star, ShieldCheck, Package } from 'lucide-react';
import { formatPrice } from '../utils/format';
import StatCard from '../components/ui/StatCard';
import { Avatar } from '../components/ui/Avatar';
import { fadeUp, stagger } from '../components/ui/motion';

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: () => admin.getDashboard().then((r) => r.data),
  });

  const stats = data?.stats;
  const recentUsers = data?.recentUsers || [];
  const recentSearches = data?.recentSearches || [];
  const trendingProducts = data?.trendingProducts || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="shimmer h-10 w-56 rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="shimmer h-24 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const statDefs = [
    { icon: Users, label: 'Users', value: stats?.totalUsers || 0 },
    { icon: ShoppingBag, label: 'Products', value: stats?.totalProducts || 0 },
    { icon: Search, label: 'Searches', value: stats?.totalSearches || 0 },
    { icon: BarChart3, label: 'Comparisons', value: stats?.totalComparisons || 0 },
    { icon: TrendingUp, label: 'Clicks', value: stats?.totalClicks || 0 },
    { icon: Package, label: 'Decisions', value: stats?.totalDecisions || 0 },
  ];

  return (
    <div className="space-y-10">
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <div className="eyebrow mb-2">Operations</div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-ink-100">Admin dashboard</h1>
        <p className="mt-2 text-ink-400 text-[15px]">Health and activity across the engine.</p>
      </motion.div>

      <motion.div variants={stagger(0.06)} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {statDefs.map((s) => (
          <StatCard key={s.label} icon={s.icon} label={s.label} value={s.value} />
        ))}
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Popular brands */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-[15px] font-semibold text-ink-100">Popular brands</h2>
            <ShieldCheck className="w-4 h-4 text-accent-400" />
          </div>
          <div className="space-y-1">
            {stats?.popularBrands?.slice(0, 8).map((brand, i) => (
              <div key={brand.name} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-surface-200 transition-colors">
                <div className="flex items-center gap-3 text-[13px]">
                  <span className="w-5 text-[12px] text-ink-400">{i + 1}.</span>
                  <span className="text-ink-200">{brand.name}</span>
                </div>
                <span className="text-[13px] font-semibold text-ink-100">{brand.count}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Popular categories */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-[15px] font-semibold text-ink-100">Popular categories</h2>
            <Package className="w-4 h-4 text-accent-400" />
          </div>
          <div className="space-y-1">
            {stats?.popularCategories?.slice(0, 8).map((cat, i) => (
              <div key={cat.name} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-surface-200 transition-colors">
                <div className="flex items-center gap-3 text-[13px]">
                  <span className="w-5 text-[12px] text-ink-400">{i + 1}.</span>
                  <span className="text-ink-200">{cat.name}</span>
                </div>
                <span className="text-[13px] font-semibold text-ink-100">{cat.count}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent users */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-[15px] font-semibold text-ink-100">Recent users</h2>
            <Users className="w-4 h-4 text-accent-400" />
          </div>
          <div className="space-y-1">
            {recentUsers.slice(0, 5).map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-surface-200 transition-colors">
                <Avatar name={u.name} size={32} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-ink-100 truncate">{u.name}</p>
                  <p className="text-[11px] text-ink-400 truncate">{u.email}</p>
                </div>
                <span className="text-[11px] text-ink-400 shrink-0">
                  {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent searches */}
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-[15px] font-semibold text-ink-100">Recent searches</h2>
            <Search className="w-4 h-4 text-accent-400" />
          </div>
          <div className="space-y-1">
            {recentSearches.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-surface-200 transition-colors">
                <div className="min-w-0 flex-1 mr-3">
                  <p className="text-[13px] text-ink-100 truncate">{s.prompt}</p>
                  <p className="text-[11px] text-ink-400">{s.userName || 'Guest'}</p>
                </div>
                <span className="text-[11px] text-ink-400 shrink-0">
                  {new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Trending products */}
      <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-[15px] font-semibold text-ink-100">Trending products</h2>
          <TrendingUp className="w-4 h-4 text-accent-400" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {trendingProducts.slice(0, 6).map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-2xl p-2.5 hover:bg-surface-200 transition-colors">
              <img src={p.image} alt={p.name} className="w-12 h-12 rounded-xl object-cover bg-surface-200 border border-line shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-ink-100 truncate">{p.name}</p>
                <p className="text-[11px] text-ink-400">{p.brand}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[13px] font-semibold text-ink-100">{formatPrice(p.price, p.currency)}</p>
                <div className="flex items-center gap-1 justify-end">
                  <Star className="w-3 h-3 fill-warning text-warning" />
                  <span className="text-[11px] text-ink-400">{p.rating}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
