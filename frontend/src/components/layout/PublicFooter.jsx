import { Link } from 'react-router-dom';
import { Sparkles, ShoppingBag } from 'lucide-react';
import Logo from '../ui/Logo';

export default function PublicFooter() {
  return (
    <footer className="border-t border-surface-300 bg-surface-100/30">
      <div className="shell py-12">
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <Logo size={28} />
            </div>
            <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-surface-500">
              The AI buying agent. Analyze, reason, and decide — then buy with confidence.
            </p>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-surface-500">
              <ShoppingBag className="w-3.5 h-3.5 text-primary-500" />
              <span>Currently supports: Amazon, Flipkart</span>
            </div>
          </div>

          {/* Company */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-surface-500 mb-3">Company</p>
            <ul className="space-y-2">
              <li><Link to="/about" className="text-[13px] text-surface-600 hover:text-white transition-colors">About</Link></li>
              <li><Link to="/privacy" className="text-[13px] text-surface-600 hover:text-white transition-colors">Privacy</Link></li>
              <li><Link to="/terms" className="text-[13px] text-surface-600 hover:text-white transition-colors">Terms</Link></li>
            </ul>
          </div>

          {/* Product */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-surface-500 mb-3">Product</p>
            <ul className="space-y-2">
              <li><Link to="/analyze" className="text-[13px] text-surface-600 hover:text-white transition-colors">Analyze Product</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-5 border-t border-surface-300 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-surface-500">© {new Date().getFullYear()} Ayymus. All rights reserved.</p>
          <p className="text-[11px] text-surface-500 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-primary-500" />
            Decisions powered by AI reasoning
          </p>
        </div>
      </div>
    </footer>
  );
}
