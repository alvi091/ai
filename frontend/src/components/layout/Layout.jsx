import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, Sparkles, Heart, GitCompare, History, User, Settings,
  LogOut, LogIn, Menu, X, Shield, Command, Search,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Logo from '../ui/Logo';
import { fadeUpSm } from '../../lib/motion';

const NAV = [
  {
    group: 'Intelligence',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
      { to: '/search', icon: Sparkles, label: 'AI Search' },
    ],
  },
  
  {
    group: 'Account',
    items: [
      { to: '/profile', icon: User, label: 'Profile' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = user?.role === 'admin' || user?.isAdmin;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const initials = (user?.name || 'U').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const sidebar = (
    <div className="relative flex flex-col h-full">
      <div className="absolute inset-x-0 top-0 h-40 pointer-events-none glow-teal opacity-70" />

      <div className="relative px-5 pt-7 pb-5">
        <div className="flex items-center justify-between">
          <Logo size={26} />
          <span className="px-2 py-0.5 rounded-md bg-primary-600/[0.14] border border-primary-600/25 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary-300">
            Beta
          </span>
        </div>
      </div>

      <div className="relative px-4 mb-6">
        <button
          onClick={() => { setSidebarOpen(false); navigate('/search'); }}
          className="group relative w-full flex items-center gap-3 pl-4 pr-3 h-12 rounded-2xl overflow-hidden bg-gradient-to-br from-primary-600 to-primary-900 border border-primary-500/40 shadow-[0_10px_28px_-10px_rgba(15,118,110,0.8),inset_0_1px_0_rgba(255,255,255,0.14)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-10px_rgba(20,184,166,0.7)]"
        >
          <span className="absolute inset-0 opacity-40 pointer-events-none group-hover:opacity-60 transition-opacity duration-300" style={{ background: 'radial-gradient(120% 100% at 20% 0%, rgba(255,255,255,0.18), transparent 50%)' }} />
          <Sparkles className="relative w-[18px] h-[18px] text-primary-200" />
          <span className="relative text-[13px] font-semibold text-white">Ask the AI</span>
          <kbd className="relative ml-auto flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/10 border border-white/15 text-[10px] text-primary-100">
            <Command className="w-3 h-3" /> K
          </kbd>
        </button>
      </div>

      <div className="relative px-3 flex-1 overflow-y-auto scrollbar-none">
        {NAV.map((group) => (
          <div key={group.group} className="mb-7">
            <p className="px-3 mb-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-surface-600">
              {group.group}
            </p>
            <nav className="space-y-1">
              {group.items.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 pl-3.5 pr-3 h-11 rounded-xl text-[13.5px] font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-primary-600/[0.12] text-primary-200 border border-primary-600/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                        : 'text-surface-600 border border-transparent hover:text-white hover:bg-surface-200/80'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-primary-400 shadow-[0_0_12px_rgba(20,184,166,0.7)]" />
                      )}
                      <Icon className={`w-[18px] h-[18px] transition-colors ${isActive ? 'text-primary-400' : 'text-surface-500 group-hover:text-surface-300'}`} />
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        ))}

        {isAdmin && (
          <div className="mb-7">
            <p className="px-3 mb-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-surface-600">System</p>
            <nav className="space-y-1">
              <NavLink
                to="/admin"
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 pl-3.5 pr-3 h-11 rounded-xl text-[13.5px] font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-600/[0.12] text-primary-200 border border-primary-600/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                      : 'text-surface-600 border border-transparent hover:text-white hover:bg-surface-200/80'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-primary-400 shadow-[0_0_12px_rgba(20,184,166,0.7)]" />
                    )}
                    <Shield className={`w-[18px] h-[18px] transition-colors ${isActive ? 'text-primary-400' : 'text-surface-500 group-hover:text-surface-300'}`} />
                    Admin
                  </>
                )}
              </NavLink>
            </nav>
          </div>
        )}
      </div>

      <div className="relative p-3 border-t border-surface-300/80">
        {user ? (
          <div className="rounded-2xl bg-surface-200/60 border border-surface-300/80 p-3">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600/25 to-primary-900/50 border border-primary-600/30 text-[13px] font-bold text-primary-300">
                  {initials}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-surface-200" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white truncate">{user?.name || 'User'}</p>
                <p className="text-[11px] text-surface-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-2.5 flex items-center justify-center gap-2 w-full h-9 rounded-lg text-[12.5px] font-medium text-surface-500 hover:text-danger hover:bg-danger/10 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700/25 to-primary-900/10 border border-primary-600/30 p-4">
            <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-primary-600/25 blur-[50px] pointer-events-none" />
            <div className="relative">
              <p className="text-[13px] font-semibold text-white">Sign in to unlock your dashboard</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-surface-500">
                Save searches & get personalized buying decisions.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="mt-3 flex items-center justify-center gap-2 w-full h-9 rounded-lg bg-primary-700 text-white border border-primary-500/40 text-[12.5px] font-semibold hover:bg-primary-hover transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Sign in
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Main column - no sidebar */}
      <div>
        <header className="sticky top-0 z-30 bg-surface-50/85 backdrop-blur-xl border-b border-surface-300/70">
          <div className="flex items-center gap-3 px-4 sm:px-8 h-16">
            <Logo size={24} />

            <nav className="hidden md:flex items-center gap-1 ml-4">
              <NavLink
                to="/analyze"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-xl text-[13px] font-medium transition-all ${
                    isActive
                      ? 'text-primary-400 bg-primary-600/10'
                      : 'text-surface-600 hover:text-white hover:bg-surface-200'
                  }`
                }
              >
                Analyze
              </NavLink>
              {user && (
                <>
                  <NavLink
                    to="/dashboard"
                    className={({ isActive }) =>
                      `px-3 py-2 rounded-xl text-[13px] font-medium transition-all ${
                        isActive
                          ? 'text-primary-400 bg-primary-600/10'
                          : 'text-surface-600 hover:text-white hover:bg-surface-200'
                      }`
                    }
                  >
                    Dashboard
                  </NavLink>
                  <NavLink
                    to="/wishlist"
                    className={({ isActive }) =>
                      `px-3 py-2 rounded-xl text-[13px] font-medium transition-all ${
                        isActive
                          ? 'text-primary-400 bg-primary-600/10'
                          : 'text-surface-600 hover:text-white hover:bg-surface-200'
                      }`
                    }
                  >
                    Wishlist
                  </NavLink>
                </>
              )}
            </nav>

            <div className="flex-1" />

            <button
              onClick={() => navigate('/search')}
              className="group flex items-center gap-2.5 h-10 pl-3.5 pr-2 rounded-2xl border border-surface-300 bg-surface-100 text-[13px] text-surface-500 hover:border-primary-600/50 hover:text-surface-300 transition-all"
            >
              <Search className="w-4 h-4 text-surface-500 group-hover:text-primary-400" />
              <span className="hidden sm:inline">Ask the AI anything…</span>
            </button>

            {user ? (
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center justify-center w-9 h-9 rounded-2xl bg-surface-200 border border-surface-300 text-[12px] font-semibold text-primary-400 hover:border-primary-600/50 transition-all"
                aria-label="Profile"
              >
                {initials}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 rounded-xl text-[13px] font-medium text-surface-600 hover:text-white hover:bg-surface-200 transition-all"
                >
                  Sign in
                </button>
                <button
                  onClick={() => navigate('/signup')}
                  className="btn btn-sm btn-primary"
                >
                  Get started
                </button>
              </div>
            )}
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
    </div>
  );
}

function navLabel(pathname) {
  const map = {
    '/dashboard': 'Overview',
    '/search': 'AI Search',
    '/wishlist': 'Wishlist',
    '/compare': 'Compare',
    '/history': 'History',
    '/profile': 'Profile',
    '/settings': 'Settings',
    '/admin': 'Admin',
  };
  if (pathname.startsWith('/products/')) return 'Decision Center';
  const label = map[pathname];
  return label || 'Ayymus';
}
