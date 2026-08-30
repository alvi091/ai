import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from './components/layout/Layout';
import Logo from './components/ui/Logo';

const Landing = lazy(() => import('./pages/Landing'));
const Analyze = lazy(() => import('./pages/Analyze'));
const About = lazy(() => import('./pages/About'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Terms = lazy(() => import('./pages/Terms'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const SearchResults = lazy(() => import('./pages/SearchResults'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const Compare = lazy(() => import('./pages/Compare'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const SearchHistory = lazy(() => import('./pages/SearchHistory'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const NotFound = lazy(() => import('./pages/NotFound'));

function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-surface-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Logo size={52} />
      </motion.div>
      <div className="flex items-center gap-1.5" aria-label="Loading">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2 w-2 rounded-full bg-primary-light"
            animate={{ opacity: [0.25, 1, 0.25], y: [0, -4, 0] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppRoutes() {
  const location = useLocation();
  return (
    <>
      <ScrollToTop />
      <Layout>
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
            <Route index element={<Suspense fallback={<Splash />}><Landing /></Suspense>} />
            <Route path="analyze" element={<Suspense fallback={<Splash />}><Analyze /></Suspense>} />
            <Route path="search" element={<Suspense fallback={<Splash />}><SearchResults /></Suspense>} />
            <Route path="products/:id" element={<Suspense fallback={<Splash />}><ProductDetail /></Suspense>} />
            <Route path="dashboard" element={<Suspense fallback={<Splash />}><Dashboard /></Suspense>} />
            <Route path="wishlist" element={<Suspense fallback={<Splash />}><Wishlist /></Suspense>} />
            <Route path="compare" element={<Suspense fallback={<Splash />}><Compare /></Suspense>} />
            <Route path="history" element={<Suspense fallback={<Splash />}><SearchHistory /></Suspense>} />
            <Route path="profile" element={<Suspense fallback={<Splash />}><Profile /></Suspense>} />
            <Route path="settings" element={<Suspense fallback={<Splash />}><Settings /></Suspense>} />
            <Route path="admin" element={<Suspense fallback={<Splash />}><AdminDashboard /></Suspense>} />
            <Route path="about" element={<Suspense fallback={<Splash />}><About /></Suspense>} />
            <Route path="privacy" element={<Suspense fallback={<Splash />}><Privacy /></Suspense>} />
            <Route path="terms" element={<Suspense fallback={<Splash />}><Terms /></Suspense>} />
            <Route path="*" element={<Suspense fallback={<Splash />}><NotFound /></Suspense>} />
          </Routes>
        </AnimatePresence>
      </Layout>
    </>
  );
}

export default function App() {
  return <AppRoutes />;
}
