import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import Logo from '../ui/Logo';
import { fadeUpSm } from '../../lib/motion';

const NAV = [
  { to: '/analyze', label: 'Analyze' },
  { to: '/about', label: 'About' },
  
];

export default function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isLanding = location.pathname === '/';

  const scrollTo = useCallback((id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Floating Navbar */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="fixed top-0 left-0 right-0 z-50"
      >
        <div className="mx-auto max-w-[1440px] px-3 sm:px-8 lg:px-12">
          <div className="mt-4 flex items-center justify-between gap-2 h-14 px-3 sm:px-4 rounded-2xl border border-surface-300/70 bg-surface-100/80 backdrop-blur-xl">
            {/* Logo */}
            <Logo size={26} />

            {/* Desktop Nav - Right */}
            <div className="hidden md:flex items-center gap-1 ml-auto">
              {isLanding ? (
                <>
                  <button
                    onClick={() => scrollTo('how')}
                    className="px-4 py-2 rounded-xl text-[13px] font-medium text-surface-600 hover:text-white hover:bg-surface-200 transition-all"
                  >
                    How it works
                  </button>
                  <button
                    onClick={() => scrollTo('cta')}
                    className="px-4 py-2 rounded-xl text-[13px] font-medium text-surface-600 hover:text-white hover:bg-surface-200 transition-all"
                  >
                    Analyze
                  </button>
                </>
              ) : (
                NAV.map(({ to, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `px-4 py-2 rounded-xl text-[13px] font-medium transition-all ${
                        isActive
                          ? 'text-primary-400 bg-primary-600/10'
                          : 'text-surface-600 hover:text-white hover:bg-surface-200'
                      }`
                    }
                  >
                    {label}
                  </NavLink>
                ))
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl text-surface-600 hover:text-white hover:bg-surface-200 transition-all"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Nav Dropdown */}
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="md:hidden mt-2 rounded-2xl border border-surface-300 bg-surface-100/95 backdrop-blur-xl overflow-hidden shadow-lift"
              >
                <div className="p-2 flex flex-col">
                  {isLanding ? (
                    <>
                      <button
                        onClick={() => scrollTo('how')}
                        className="px-4 py-3 rounded-xl text-left text-[14px] font-medium text-surface-700 hover:text-white hover:bg-surface-200 transition-all"
                      >
                        How it works
                      </button>
                      <button
                        onClick={() => { setMenuOpen(false); scrollTo('cta'); }}
                        className="px-4 py-3 rounded-xl text-left text-[14px] font-medium text-primary-400 hover:bg-surface-200 transition-all"
                      >
                        Analyze a product
                      </button>
                    </>
                  ) : (
                    NAV.map(({ to, label }) => (
                      <button
                        key={to}
                        onClick={() => { setMenuOpen(false); navigate(to); }}
                        className={`px-4 py-3 rounded-xl text-left text-[14px] font-medium transition-all ${
                          location.pathname === to
                            ? 'text-primary-400 bg-primary-600/10'
                            : 'text-surface-700 hover:text-white hover:bg-surface-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.header>

      <main className={isLanding ? '' : 'px-4 sm:px-8 pt-28 pb-8 lg:pt-32 lg:pb-10'}>
        {isLanding ? (
          children
        ) : (
          <div className="mx-auto w-full max-w-[1200px]">
            <motion.div key={location.pathname} variants={fadeUpSm} initial="hidden" animate="show">
              {children}
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
