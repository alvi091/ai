import { Brain, ShieldCheck, TrendingDown, GitCompare, Heart, Gauge } from 'lucide-react';
import StaticPage from '../components/layout/StaticPage';

const PILLARS = [
  { icon: Brain, title: 'AI Decision Engine', desc: 'We reason about suitability, value, and timing before recommending anything — never just a search index.' },
  { icon: Gauge, title: 'Worth Scores', desc: 'Every product gets a transparent 0–100 worth score built from reviews, price fairness, risk, and durability.' },
  { icon: TrendingDown, title: 'Price Intelligence', desc: 'Historical trends, fair-price estimates, and timing signals so you never buy at the top.' },
  { icon: Heart, title: 'Shopping Memory', desc: 'Ayymus learns your budget, style, and preferences to personalize every decision over time.' },
  { icon: GitCompare, title: 'Intelligent Comparison', desc: 'Radar-grade attribute comparison with a clear AI verdict — no spreadsheet tables.' },
  { icon: ShieldCheck, title: 'Honest Signals', desc: 'If a store blocks us or a page is sparse, we say so instead of faking data for products we can\u2019t read.' },
];

export default function About() {
  return (
    <StaticPage
      eyebrow="About"
      title="We turn buying anxiety into clear decisions."
      description="Ayymus is an AI buying agent. Paste a product link or describe what you need, and we crawl, analyze, and reason through value, risk, and timing before telling you buy, wait, or avoid — with the reasoning exposed."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PILLARS.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="card card-pad">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary-600/25 bg-primary-600/10">
              <Icon className="h-5 w-5 text-primary-300" />
            </span>
            <h2 className="mt-4 font-display text-[15px] font-semibold text-white">{title}</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-surface-500">{desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-line bg-surface-100 p-8">
        <h2 className="font-display text-lg font-semibold text-white">Our promise</h2>
        <div className="mt-4 space-y-3 text-[14px] leading-relaxed text-surface-500">
          <p>• We never invent reviews, prices, or ratings for pages we couldn\u2019t read. A blocked store returns a clear explanation — not a confident guess.</p>
          <p>• Every recommendation shows its reasoning: why this product fits, what it scores on, and what could go wrong.</p>
          <p>• Your shopping data personalizes your results and stays private to your account.</p>
          <p>• We benchmark products against real marketplaces so a fair price is defined by the market, not by us.</p>
        </div>
      </div>
    </StaticPage>
  );
}
