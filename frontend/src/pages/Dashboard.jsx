import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign, Target, Heart, TrendingUp, Sparkles, ArrowRight, Zap, Clock, Brain,
} from 'lucide-react';
import { products, dashboard as dashboardApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/ui/PageHeader';
import AiSearchBar from '../components/ui/AiSearchBar';
import StatsCard from '../components/ui/StatsCard';
import ProductCard from '../components/ui/ProductCard';
import InsightCard from '../components/ui/InsightCard';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import { fadeUp, stagger } from '../lib/motion';
import { useCountUp } from '../lib/hooks';
import { formatPrice, timeAgo } from '../utils/format';

const EXAMPLES = [
  'Noise-cancelling headphones under ₹20,000',
  'Ergonomic chair for 8h workdays',
  '4K monitor for photo editing',
];

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Working late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: trendingData, isLoading: trendingLoading } = useQuery({
    queryKey: ['trendingProducts'],
    queryFn: async () => (await products.getTrending()).data.products,
  });

  const { data: dash, isLoading: dashLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => (await dashboardApi.get()).data,
    staleTime: 30000,
  });

  const trending = trendingData || [];
  const wishlistItems = dash?.wishlistItems || [];
  const recentDecisions = dash?.recentDecisions || [];
  const categories = dash?.favoriteCategories || [];

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Overview"
        title={`${greeting()}, ${user?.name?.split(' ')[0] || 'there'}`}
        description="Here's what your AI buying agent is tracking."
        actions={
          <Badge tone="teal" icon={Sparkles} dot>
            {dash?.persona ? `Persona: ${dash.persona}` : 'Learning your taste'}
          </Badge>
        }
      />

      {/* AI Search */}
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <AiSearchBar
          value=""
          onChange={() => {}}
          onSubmit={(q) => navigate(`/search?q=${encodeURIComponent(q)}`)}
          placeholder="What should you buy next? Describe it naturally…"
          examples={EXAMPLES}
        />
      </motion.div>

      {/* Stats */}
      <motion.div variants={stagger(0.06)} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={DollarSign}
          label="Estimated savings"
          value={Number(dash?.insights?.moneySaved) || 0}
          format={(v) => formatPrice(v, 'INR')}
          accent="success"
          sub="vs paying at peak prices"
        />
        <StatsCard
          icon={Target}
          label="Decision accuracy"
          value={dash?.decisionAccuracy || 0}
          suffix="%"
          accent="teal"
          sub={dash?.decisionAccuracy ? 'model confidence average' : 'awaiting your first decision'}
        />
        <StatsCard
          icon={Heart}
          label="Wishlist value"
          value={Number(dash?.totalWishlistValue) || 0}
          format={(v) => formatPrice(v, 'INR')}
          accent="neutral"
          sub={`${wishlistItems.length} saved items`}
        />
        <StatsCard
          icon={TrendingUp}
          label="AI searches"
          value={dash?.insights?.totalSearches || 0}
          accent="teal"
          sub={dash?.insights?.comparisonUsage ? `${dash.insights.comparisonUsage} comparisons` : 'start exploring'}
        />
      </motion.div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Recent decisions */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="lg:col-span-2">
          <div className="card card-pad h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary-600/12 border border-primary-600/25">
                  <Brain className="w-4 h-4 text-primary-400" />
                </span>
                <div>
                  <h2 className="text-[16px] font-semibold text-white">Recent decisions</h2>
                  <p className="text-[12px] text-surface-500">Latest reasoning by your agent</p>
                </div>
              </div>
              <button onClick={() => navigate('/history')} className="text-[13px] font-medium text-primary-500 hover:text-primary-hover transition-colors inline-flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {dashLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" rounded="rounded-xl" />)}
              </div>
            ) : recentDecisions.length === 0 ? (
              <div className="text-center py-14">
                <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-surface-200 border border-surface-300 mx-auto mb-4">
                  <Zap className="w-5 h-5 text-surface-500" />
                </span>
                <p className="text-[14px] text-surface-500">Your decisions will appear here.</p>
                <p className="text-[13px] text-surface-500 mt-1">Ask the AI about something you need.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentDecisions.slice(0, 5).map((d, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 rounded-2xl border border-surface-300/60 bg-surface-100 px-4 py-3 hover:border-primary-600/40 transition-colors"
                  >
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary-600/10 text-primary-400 shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-surface-800 truncate">{d.productName}</p>
                      <p className="text-[12px] text-surface-500">{d.type === 'decision_viewed' ? 'Decision analyzed' : 'Recommendation viewed'} · {timeAgo(d.date)}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Category focus */}
        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <div className="card card-pad h-full">
            <h2 className="text-[16px] font-semibold text-white mb-6">Category focus</h2>
            {categories.length === 0 ? (
              <p className="text-[13px] text-surface-500 leading-relaxed">
                Once you explore, Ayymus maps your attention across categories to sharpen future recommendations.
              </p>
            ) : (
              <div className="space-y-4">
                {categories.slice(0, 5).map((cat, i) => (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[13px] text-surface-700">{cat.name}</span>
                      <span className="tnum text-[13px] font-medium text-surface-500">{cat.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-300 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-primary-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(8, (cat.count / (categories[0].count || 1)) * 100)}%` }}
                        transition={{ duration: 0.8, delay: i * 0.08 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <CategoryFocusCard dash={dash} />
          </div>
        </motion.div>
      </div>

      {/* Wishlist highlights */}
      {wishlistItems.length > 0 && (
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <Heart className="w-5 h-5 text-danger" />
              <h2 className="text-[20px] font-semibold tracking-tight text-white">Wishlist insights</h2>
            </div>
            <button onClick={() => navigate('/wishlist')} className="text-[13px] font-medium text-primary-500 hover:text-primary-hover transition-colors inline-flex items-center gap-1">
              Open wishlist <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {wishlistItems.slice(0, 4).map((item, i) => (
              <WishlistMini key={item.id || i} item={item} index={i} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Trending */}
      <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <TrendingUp className="w-5 h-5 text-primary-400" />
            <h2 className="text-[20px] font-semibold tracking-tight text-white">High-intent products</h2>
          </div>
          <button onClick={() => navigate('/search')} className="text-[13px] font-medium text-primary-500 hover:text-primary-hover transition-colors inline-flex items-center gap-1">
            Explore <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {trendingLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-[380px] w-full" />)}
          </div>
        ) : trending.length === 0 ? (
          <InsightCard icon={Clock} title="Nothing here yet">
            <p>Search for products to populate this view.</p>
          </InsightCard>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trending.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function CategoryFocusCard({ dash }) {
  const moneySaved = Number(dash?.insights?.moneySaved) || 0;
  const saved = useCountUp(moneySaved, { enabled: moneySaved > 0 });
  if (!moneySaved) return null;
  return (
    <div className="mt-6 pt-5 border-t border-surface-300">
      <p className="text-[12px] text-surface-500">All-time estimated savings</p>
      <p className="tnum mt-1 text-[28px] font-semibold tracking-tight text-success">
        {formatPrice(saved, 'INR')}
      </p>
    </div>
  );
}

function WishlistMini({ item, index }) {
  const navigate = useNavigate();
  const p = item.product || item;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      onClick={() => navigate(`/products/${p.id}`)}
      className="card card-pad p-4 card-hover cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-surface-200 shrink-0">
          <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-surface-800 truncate">{p.name}</p>
          <p className="tnum text-[14px] font-semibold text-white mt-0.5">
            {formatPrice(p.price, p.currency)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
