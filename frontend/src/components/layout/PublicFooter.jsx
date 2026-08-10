import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import Logo from '../ui/Logo';

const COLUMNS = [
  { title: 'Product', links: [{ label: 'AI Search', to: '/search' }, { label: 'Wishlist', to: '/wishlist' }, { label: 'Compare', to: '/compare' }, { label: 'History', to: '/history' }] },
  { title: 'Company', links: [{ label: 'About', to: '/about' }, { label: 'Privacy', to: '/privacy' }, { label: 'Terms', to: '/terms' }] },
];

export default function PublicFooter() {
  return (
    <footer className="border-t border-surface-300">
      <div className="shell py-14">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo size={32} />
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-surface-500">
              The AI buying agent. Analyze, reason, and decide — then buy with confidence.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-surface-500 mb-4">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-[13px] text-surface-700 hover:text-white transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-6 border-t border-surface-300 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-surface-500">© {new Date().getFullYear()} Ayymus. All rights reserved.</p>
          <p className="text-[12px] text-surface-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary-500" />
            Decisions powered by AI reasoning
          </p>
        </div>
      </div>
    </footer>
  );
}
