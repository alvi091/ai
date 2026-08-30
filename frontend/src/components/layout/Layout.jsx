import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, Sparkles, Heart, GitCompare, History, User, Settings,
  Menu, X, Shield, Search,
} from 'lucide-react';
import Logo from '../ui/Logo';
import { fadeUpSm } from '../../lib/motion';

const NAV = [
  { to: '/analyze', icon: Sparkles, label: 'Analyze' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/wishlist', icon: Heart, label: 'Wishlist' },
  { to: '/compare', icon: GitCompare, label: 'Compare' },
  { to: '/history', icon: History, label: 'History' },
];

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm sm:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-72 bg-surface-50 border-l border-surface-300 shadow-2xl sm:hidden overflow-y-auto"
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-4">
                <Logo size={22} />
                <button onClick={() => setDrawerOpen(false)} className="p-2 rounded-xl hover:bg-surface-200 transition-colors">
                  <X className="w-5 h-5 text-surface-500" />
                </button>
              </div>

              <nav className="px-4 pb-6 space-y-1">
                {NAV.map(({ to, icon: Icon, label }) => (
                  <button
                    key={to}
                    onClick={() => { setDrawerOpen(false); navigate(to); }}
                    className={`flex items-center gap-3 w-full h-11 px-3 rounded-xl text-[13.5px] font-medium transition-all ${
                      location.pathname === to
                        ? 'text-primary-400 bg-primary-600/10'
                        : 'text-surface-600 hover:text-white hover:bg-surface-200'
                    }`}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                    {label}
                  </button>
                ))}
                <button
                  onClick={() => { setDrawerOpen(false); navigate('/admin'); }}
                  className="flex items-center gap-3 w-full h-11 px-3 rounded-xl text-[13.5px] font-medium text-surface-600 hover:text-white hover:bg-surface-200 transition-all"
                >
                  <Shield className="w-[18px] h-[18px]" />
                  Admin
                </button>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-surface-50/85 backdrop-blur-xl border-b border-surface-300/70">
        <div className="flex items-center gap-3 px-4 sm:px-8 h-16">
          <Logo size={24} />

          <div className="flex-1 flex justify-center">
            <nav className="hidden md:flex items-center gap-1">
              {NAV.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-xl text-[13px] font-medium transition-all ${
                      isActive
                        ? 'text-primary-400 bg-primary-600/10'
                        : 'text-surface-600 hover:text-white hover:bg-surface-200'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-xl text-[13px] font-medium transition-all ${
                    isActive
                      ? 'text-primary-400 bg-primary-600/10'
                      : 'text-surface-600 hover:text-white hover:bg-surface-200'
                  }`
                }
              >
                Admin
              </NavLink>
            </nav>
          </div>

          <button
            onClick={() => navigate('/search')}
            className="hidden sm:flex group items-center gap-2.5 h-10 pl-3.5 pr-2 rounded-2xl border border-surface-300 bg-surface-100 text-[13px] text-surface-500 hover:border-primary-600/50 hover:text-surface-300 transition-all"
          >
            <Search className="w-4 h-4 text-surface-500 group-hover:text-primary-400" />
            <span>Ask the AI anything…</span>
          </button>

          <button
            onClick={() => setDrawerOpen(true)}
            className="sm:hidden flex items-center justify-center w-9 h-9 rounded-2xl bg-surface-200 border border-surface-300 text-surface-500 hover:border-primary-600/50 transition-all"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="px-4 sm:px-8 py-8 lg:py-10">
        <div className="mx-auto w-full max-w-[1200px]">
          <motion.div key={location.pathname} variants={fadeUpSm} initial="hidden" animate="show">
            <Outlet />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
