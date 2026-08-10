import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Store, ArrowRight, Sparkles } from 'lucide-react';
import { products } from '../../services/api';
import ProductCard from './ProductCard';
import SectionLabel from './SectionLabel';
import Skeleton from './Skeleton';
import { fadeUp, stagger } from '../../lib/motion';

export default function MarketplaceBrowse() {
  const navigate = useNavigate();

  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['marketplace-trending'],
    queryFn: () => products.getTrending().then((r) => r.data),
  });

  const { data: catData } = useQuery({
    queryKey: ['marketplace-categories'],
    queryFn: () => products.getCategories().then((r) => r.data),
  });

  const categories = (catData?.categories || []).slice(0, 8);
  const trending = (trendData?.products || []).slice(0, 8);

  const browseCategory = (name) => {
    navigate(`/search?q=${encodeURIComponent(`best ${name} products`)}`);
  };

  return (
    <section id="marketplace" className="py-24 sm:py-32 bg-surface-100/50 border-y border-surface-300/60 scroll-mt-24">
      <div className="shell">
        <motion.div
          variants={stagger(0.08)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-6"
        >
          <div className="max-w-2xl">
            <motion.div variants={fadeUp}>
              <SectionLabel>Marketplace</SectionLabel>
            </motion.div>
            <motion.h2 variants={fadeUp} className="mt-3 text-[32px] sm:text-[44px] font-semibold tracking-[-0.035em] text-white">
              Browse what people are buying right now.
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-[16px] text-surface-500 leading-relaxed">
              Every product below is live from the catalog, scored and ranked by the AI. No account needed to explore.
            </motion.p>
          </div>

          <motion.button
            variants={fadeUp}
            onClick={() => navigate('/search')}
            className="btn-secondary shrink-0"
          >
            <Store className="w-4 h-4" />
            Browse all products
          </motion.button>
        </motion.div>

        {/* Category chips */}
        <div className="mt-10 flex flex-wrap gap-2.5">
          {categories.map((c) => (
            <button
              key={c.name}
              onClick={() => browseCategory(c.name)}
              className="group inline-flex items-center gap-2 px-4 h-10 rounded-full border border-surface-300 bg-surface-100 text-[13px] font-medium text-surface-700 transition-all duration-200 hover:border-primary-600/60 hover:text-white hover:bg-surface-200"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500/60 group-hover:bg-primary-400" />
              {c.name}
              <span className="tnum text-[11px] text-surface-500 group-hover:text-primary-400">{c.count}</span>
            </button>
          ))}
        </div>

        {/* Product grid */}
        <motion.div
          variants={stagger(0.06)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {trendLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card overflow-hidden">
                  <Skeleton className="aspect-[4/3] w-full rounded-none" />
                  <div className="p-5 space-y-3">
                    <Skeleton className="h-3 w-24 rounded-lg" />
                    <Skeleton className="h-4 w-full rounded-lg" />
                    <Skeleton className="h-4 w-3/4 rounded-lg" />
                    <Skeleton className="h-9 w-full rounded-xl" />
                  </div>
                </div>
              ))
            : trending.map((p, i) => (
                <motion.div key={p.id} variants={fadeUp}>
                  <ProductCard product={p} index={i} />
                </motion.div>
              ))}
        </motion.div>

        {!trendLoading && trending.length === 0 && (
          <div className="mt-12 flex flex-col items-center justify-center rounded-3xl border border-dashed border-surface-300 py-16 text-center">
            <Sparkles className="w-6 h-6 text-primary-500" />
            <p className="mt-3 text-[15px] font-medium text-white">Catalog is warming up</p>
            <p className="mt-1 text-[13px] text-surface-500">Products will appear here shortly.</p>
            <button onClick={() => navigate('/search')} className="btn btn-sm btn-primary mt-5">
              Try an AI search <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
