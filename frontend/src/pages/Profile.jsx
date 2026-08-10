import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User, Mail, Calendar, Fingerprint, Search, Heart, GitCompareArrows,
  Sparkles, ArrowUpRight, Award, Wallet, Target,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { search, wishlist, decision as decisionApi } from '../services/api';
import { Avatar } from '../components/ui/Avatar';
import ConfidenceRing from '../components/ui/ConfidenceRing';
import StatCard from '../components/ui/StatCard';
import { fadeUp, stagger } from '../components/ui/motion';

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: searchData } = useQuery({
    queryKey: ['search-history-count'],
    queryFn: () => search.getHistory({ limit: 1 }).then((r) => r.data),
  });

  const { data: wishlistData } = useQuery({
    queryKey: ['wishlist-count'],
    queryFn: () => wishlist.getAll().then((r) => r.data),
  });

  const { data: personaData } = useQuery({
    queryKey: ['persona'],
    queryFn: () => decisionApi.getPersona().then((r) => r.data),
    staleTime: 60000,
  });

  const historyCount = Array.isArray(searchData) ? searchData.length : searchData?.total || searchData?.history?.length || 0;
  const wishlistCount = Array.isArray(wishlistData) ? wishlistData.length : wishlistData?.total || wishlistData?.items?.length || 0;
  const persona = personaData?.persona;
  const confidence = personaData?.confidence ?? 74;

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : '—';

  const traits = [
    { icon: Wallet, label: 'Budget conscious', note: 'Prefers value over novelty' },
    { icon: Target, label: 'Research first', note: 'Reads deep before buying' },
    { icon: Heart, label: 'Brand loyal', note: 'Sticks to trusted labels' },
  ];

  const achievements = [
    { icon: Search, title: 'First search', desc: 'Started the journey', done: historyCount > 0 },
    { icon: Heart, title: 'Wishlist builder', desc: 'Saved 5+ items', done: wishlistCount >= 5 },
    { icon: GitCompareArrows, title: 'Decision maker', desc: 'Completed a comparison', done: false },
    { icon: Sparkles, title: 'Early adopter', desc: 'Member milestone', done: true },
  ];

  return (
    <div className="space-y-10">
      {/* Header */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="card p-7 lg:p-8">
        <div className="flex flex-wrap items-center gap-6">
          <Avatar name={user?.name} size={72} />
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-100">{user?.name || 'User'}</h1>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-2 text-[13px] text-ink-400">
              <span className="inline-flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{user?.email}</span>
              <span className="inline-flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Joined {memberSince}</span>
            </div>
          </div>
          <button onClick={() => navigate('/settings')} className="btn-secondary !h-10 text-[13px]">
            Edit preferences
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Persona */}
      {persona && (
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="card p-7 relative overflow-hidden">
          <div
            className="absolute -top-24 -right-24 w-80 h-80 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(closest-side, rgba(15,118,110,0.16), transparent)' }}
          />
          <div className="relative flex flex-wrap items-center gap-6">
            <ConfidenceRing value={confidence} size={108} strokeWidth={9}>
              <span className="font-display text-2xl font-semibold text-ink-100">{confidence}</span>
            </ConfidenceRing>
            <div className="flex-1 min-w-0">
              <div className="eyebrow mb-2">Buying personality</div>
              <h2 className="font-display text-2xl font-semibold text-ink-100">{persona}</h2>
              <p className="mt-2 text-[13px] text-ink-400 leading-relaxed max-w-xl">
                Your shopping DNA, computed continuously from searches, preferences and decisions.
                Every recommendation is tuned to this profile.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <motion.div variants={stagger(0.07)} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Search} label="Searches" value={historyCount} />
        <StatCard icon={Heart} label="Wishlist items" value={wishlistCount} />
        <StatCard icon={Fingerprint} label="Persona confidence" value={confidence} suffix="%" />
        <StatCard icon={GitCompareArrows} label="Comparisons" value={0} note="coming soon" />
      </motion.div>

      {/* DNA traits */}
      <section>
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="mb-5">
          <div className="eyebrow mb-2">Shopping DNA</div>
          <h2 className="font-display text-2xl font-semibold text-ink-100">What shapes your decisions</h2>
        </motion.div>
        <div className="grid sm:grid-cols-3 gap-5">
          {traits.map((t, i) => (
            <motion.div key={t.label} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="tile p-5">
              <div className="w-10 h-10 rounded-xl bg-surface-200 border border-line flex items-center justify-center mb-3">
                <t.icon className="w-4 h-4 text-accent-400" strokeWidth={1.75} />
              </div>
              <p className="text-sm font-medium text-ink-100">{t.label}</p>
              <p className="text-[12px] text-ink-400 mt-0.5">{t.note}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Achievements */}
      <section>
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="mb-5">
          <div className="eyebrow mb-2">Milestones</div>
          <h2 className="font-display text-2xl font-semibold text-ink-100">Achievements</h2>
        </motion.div>
        <motion.div variants={stagger(0.06)} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {achievements.map((a) => (
            <motion.div key={a.title} variants={fadeUp} className={`tile p-5 ${a.done ? '' : 'opacity-45'}`}>
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-3 ${
                a.done ? 'bg-accent-600/10 border-accent-600/25 text-accent-400' : 'bg-surface-200 border-line text-ink-400'
              }`}>
                <Award className="w-4 h-4" strokeWidth={1.75} />
              </div>
              <p className="text-sm font-medium text-ink-100">{a.title}</p>
              <p className="text-[12px] text-ink-400 mt-0.5">{a.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </div>
  );
}
