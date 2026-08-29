import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { admin, visitors } from '../services/api';
import {
  Users, ShoppingBag, Search, BarChart3, TrendingUp, Star, ShieldCheck, Package,
  Eye, UserCheck, UserX, Clock, Globe, Monitor, Smartphone, Tablet,
  ArrowUpRight, RotateCcw, Calendar, LayoutDashboard,
} from 'lucide-react';
import { formatPrice } from '../utils/format';
import StatCard from '../components/ui/StatCard';
import { Avatar } from '../components/ui/Avatar';
import { fadeUp, stagger } from '../components/ui/motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

function MiniChart({ data, dataKey, color = '#6366f1', height = 140 }) {
  if (!data?.length) return <div className="h-[140px] flex items-center justify-center text-ink-400 text-xs">No data yet</div>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(d) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ background: '#1e1b2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 12 }}
          labelFormatter={(d) => new Date(d).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })}
        />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#grad-${dataKey})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function DonutChart({ data, nameKey = 'name', valueKey = 'count' }) {
  if (!data?.length) return <div className="h-[180px] flex items-center justify-center text-ink-400 text-xs">No data</div>;
  const total = data.reduce((s, d) => s + d[valueKey], 0);
  return (
    <div className="flex items-center gap-4">
      <div className="w-[140px] h-[140px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={62} dataKey={valueKey} paddingAngle={2} strokeWidth={0}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip
              contentStyle={{ background: '#1e1b2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 12 }}
              formatter={(v) => [`${v} (${Math.round((v / total) * 100)}%)`]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 space-y-1.5">
        {data.slice(0, 6).map((d, i) => (
          <div key={d[nameKey]} className="flex items-center gap-2 text-[12px]">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="text-ink-300 truncate flex-1">{d[nameKey]}</span>
            <span className="text-ink-100 font-medium tabular-nums">{d[valueKey]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VisitorsTable({ data }) {
  if (!data?.length) return <p className="text-ink-400 text-xs text-center py-8">No visitors yet</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-line">
            <th className="pb-2 text-[11px] font-semibold text-ink-400 uppercase tracking-wider">Visitor</th>
            <th className="pb-2 text-[11px] font-semibold text-ink-400 uppercase tracking-wider">Page</th>
            <th className="pb-2 text-[11px] font-semibold text-ink-400 uppercase tracking-wider">Device</th>
            <th className="pb-2 text-[11px] font-semibold text-ink-400 uppercase tracking-wider">Browser</th>
            <th className="pb-2 text-[11px] font-semibold text-ink-400 uppercase tracking-wider">Status</th>
            <th className="pb-2 text-[11px] font-semibold text-ink-400 uppercase tracking-wider">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/50">
          {data.map((v) => (
            <tr key={v.id} className="hover:bg-surface-200/50 transition-colors">
              <td className="py-2.5 pr-3">
                <div className="flex items-center gap-2">
                  <Avatar name={v.userName} size={24} />
                  <span className="text-[12px] text-ink-200 truncate max-w-[100px]">{v.userName}</span>
                </div>
              </td>
              <td className="py-2.5 pr-3 text-[12px] text-ink-300 max-w-[140px] truncate">{v.path}</td>
              <td className="py-2.5 pr-3">
                <span className="inline-flex items-center gap-1 text-[11px] text-ink-300">
                  {v.device === 'Mobile' ? <Smartphone className="w-3 h-3" /> : v.device === 'Tablet' ? <Tablet className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                  {v.device}
                </span>
              </td>
              <td className="py-2.5 pr-3 text-[12px] text-ink-300">{v.browser}</td>
              <td className="py-2.5 pr-3">
                {v.isUnique ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400"><UserCheck className="w-3 h-3" />New</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-400"><RotateCcw className="w-3 h-3" />Return</span>
                )}
              </td>
              <td className="py-2.5 text-[11px] text-ink-400 whitespace-nowrap">
                {new Date(v.timestamp).toLocaleDateString('en', { month: 'short', day: 'numeric' })}{' '}
                {new Date(v.timestamp).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminDashboard() {
  const [days, setDays] = useState(30);

  const { data: dashData, isLoading: dashLoading } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: () => admin.getDashboard().then((r) => r.data),
  });

  const { data: vStats } = useQuery({
    queryKey: ['visitorStats'],
    queryFn: () => visitors.getStats().then((r) => r.data),
  });

  const { data: timeline } = useQuery({
    queryKey: ['visitorTimeline', days],
    queryFn: () => visitors.getTimeline(days).then((r) => r.data),
  });

  const { data: pages } = useQuery({
    queryKey: ['visitorPages', days],
    queryFn: () => visitors.getPages(days).then((r) => r.data),
  });

  const { data: referrers } = useQuery({
    queryKey: ['visitorReferrers', days],
    queryFn: () => visitors.getReferrers(days).then((r) => r.data),
  });

  const { data: devices } = useQuery({
    queryKey: ['visitorDevices', days],
    queryFn: () => visitors.getDevices(days).then((r) => r.data),
  });

  const { data: recentVisitors } = useQuery({
    queryKey: ['recentVisitors'],
    queryFn: () => visitors.getRecent(30).then((r) => r.data),
  });

  const stats = dashData?.stats;
  const recentUsers = dashData?.recentUsers || [];
  const recentSearches = dashData?.recentSearches || [];
  const trendingProducts = dashData?.trendingProducts || [];

  const isDashLoading = dashLoading && !dashData;

  if (isDashLoading) {
    return (
      <div className="space-y-6">
        <div className="shimmer h-10 w-56 rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="shimmer h-24 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  const v = vStats || {};
  const visitorStatDefs = [
    { icon: Eye, label: 'Total Visits', value: v.total?.visits || 0, color: 'text-indigo-400' },
    { icon: UserCheck, label: 'Unique Visitors', value: v.total?.unique || 0, color: 'text-purple-400' },
    { icon: RotateCcw, label: 'Returning', value: v.total?.returning || 0, color: 'text-pink-400' },
    { icon: BarChart3, label: 'Page Views', value: v.total?.pageViews || 0, color: 'text-cyan-400' },
  ];

  const todayStatDefs = [
    { icon: Calendar, label: "Today's Visits", value: v.today?.visits || 0 },
    { icon: UserCheck, label: "Today's Unique", value: v.today?.unique || 0 },
    { icon: BarChart3, label: "Today's Page Views", value: v.today?.pageViews || 0 },
    { icon: TrendingUp, label: 'This Week', value: v.thisWeek?.visits || 0, note: `${v.thisWeek?.unique || 0} unique` },
  ];

  const platformStatDefs = [
    { icon: Users, label: 'Users', value: stats?.totalUsers || 0 },
    { icon: ShoppingBag, label: 'Products', value: stats?.totalProducts || 0 },
    { icon: Search, label: 'Searches', value: stats?.totalSearches || 0 },
    { icon: BarChart3, label: 'Comparisons', value: stats?.totalComparisons || 0 },
    { icon: TrendingUp, label: 'Clicks', value: stats?.totalClicks || 0 },
    { icon: Package, label: 'Decisions', value: stats?.totalDecisions || 0 },
  ];

  const pageData = pages?.map(p => ({ name: p.path, count: p.views })) || [];

  return (
    <div className="space-y-10">
      {/* Header */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="eyebrow mb-2 flex items-center gap-2"><LayoutDashboard className="w-3.5 h-3.5" /> Admin</div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-ink-100">Dashboard</h1>
          <p className="mt-2 text-ink-400 text-[15px]">Visitors, traffic, and platform health.</p>
        </div>
        <div className="flex gap-1 bg-surface-200 rounded-xl p-1 shrink-0">
          {[7, 14, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${days === d ? 'bg-accent-500 text-white shadow-lg shadow-accent-500/20' : 'text-ink-400 hover:text-ink-200'}`}>
              {d}d
            </button>
          ))}
        </div>
      </motion.div>

      {/* Visitor Overview */}
      <motion.div variants={stagger(0.06)} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {visitorStatDefs.map((s) => (
          <StatCard key={s.label} icon={s.icon} label={s.label} value={s.value} />
        ))}
      </motion.div>

      {/* Today + This Week */}
      <motion.div variants={stagger(0.06)} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {todayStatDefs.map((s) => (
          <StatCard key={s.label} icon={s.icon} label={s.label} value={s.value} note={s.note} />
        ))}
      </motion.div>

      {/* Visitor Timeline Chart */}
      <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-[15px] font-semibold text-ink-100">Visitor Trend</h2>
          <TrendingUp className="w-4 h-4 text-accent-400" />
        </div>
        <MiniChart data={timeline} dataKey="totalVisits" color="#6366f1" height={200} />
        <div className="mt-3">
          <MiniChart data={timeline} dataKey="uniqueVisitors" color="#a855f7" height={140} />
        </div>
      </motion.div>

      {/* Pages + Referrers */}
      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-[15px] font-semibold text-ink-100">Top Pages</h2>
            <Globe className="w-4 h-4 text-accent-400" />
          </div>
          <div className="space-y-1">
            {pageData.slice(0, 8).map((p, i) => (
              <div key={p.name} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-surface-200 transition-colors">
                <div className="flex items-center gap-3 text-[13px] min-w-0 flex-1">
                  <span className="w-5 text-[12px] text-ink-400 shrink-0">{i + 1}.</span>
                  <span className="text-ink-200 truncate">{p.name}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-16 h-1.5 rounded-full bg-surface-300 overflow-hidden">
                    <div className="h-full rounded-full bg-accent-500" style={{ width: `${Math.min(100, (p.count / (pageData[0]?.count || 1)) * 100)}%` }} />
                  </div>
                  <span className="text-[13px] font-semibold text-ink-100 w-10 text-right">{p.count}</span>
                </div>
              </div>
            ))}
            {!pageData.length && <p className="text-ink-400 text-xs text-center py-6">No page data yet</p>}
          </div>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-[15px] font-semibold text-ink-100">Referrers</h2>
            <ArrowUpRight className="w-4 h-4 text-accent-400" />
          </div>
          <div className="space-y-1">
            {referrers?.slice(0, 8).map((r, i) => (
              <div key={r.referrer} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-surface-200 transition-colors">
                <div className="flex items-center gap-3 text-[13px] min-w-0 flex-1">
                  <span className="w-5 text-[12px] text-ink-400 shrink-0">{i + 1}.</span>
                  <span className="text-ink-200 truncate">{r.referrer}</span>
                </div>
                <span className="text-[13px] font-semibold text-ink-100 shrink-0">{r.visits}</span>
              </div>
            ))}
            {!referrers?.length && <p className="text-ink-400 text-xs text-center py-6">No referrer data yet</p>}
          </div>
        </motion.div>
      </div>

      {/* Devices + Browsers */}
      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-[15px] font-semibold text-ink-100">Devices</h2>
            <Monitor className="w-4 h-4 text-accent-400" />
          </div>
          <DonutChart data={devices?.devices} />
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-[15px] font-semibold text-ink-100">Browsers</h2>
            <Globe className="w-4 h-4 text-accent-400" />
          </div>
          <DonutChart data={devices?.browsers} />
        </motion.div>
      </div>

      {/* Recent Visitors */}
      <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-[15px] font-semibold text-ink-100">Recent Visitors</h2>
          <Users className="w-4 h-4 text-accent-400" />
        </div>
        <VisitorsTable data={recentVisitors?.slice(0, 15)} />
      </motion.div>

      {/* Platform Stats */}
      <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
        <div className="eyebrow mb-4">Platform</div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {platformStatDefs.map((s) => (
            <StatCard key={s.label} icon={s.icon} label={s.label} value={s.value} />
          ))}
        </div>
      </motion.div>

      {/* Popular brands + categories */}
      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-[15px] font-semibold text-ink-100">Popular brands</h2>
            <ShieldCheck className="w-4 h-4 text-accent-400" />
          </div>
          <div className="space-y-1">
            {stats?.popularBrands?.slice(0, 8).map((brand, i) => (
              <div key={brand.name} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-surface-200 transition-colors">
                <div className="flex items-center gap-3 text-[13px]">
                  <span className="w-5 text-[12px] text-ink-400">{i + 1}.</span>
                  <span className="text-ink-200">{brand.name}</span>
                </div>
                <span className="text-[13px] font-semibold text-ink-100">{brand.count}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-[15px] font-semibold text-ink-100">Popular categories</h2>
            <Package className="w-4 h-4 text-accent-400" />
          </div>
          <div className="space-y-1">
            {stats?.popularCategories?.slice(0, 8).map((cat, i) => (
              <div key={cat.name} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-surface-200 transition-colors">
                <div className="flex items-center gap-3 text-[13px]">
                  <span className="w-5 text-[12px] text-ink-400">{i + 1}.</span>
                  <span className="text-ink-200">{cat.name}</span>
                </div>
                <span className="text-[13px] font-semibold text-ink-100">{cat.count}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent users + searches */}
      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-[15px] font-semibold text-ink-100">Recent users</h2>
            <Users className="w-4 h-4 text-accent-400" />
          </div>
          <div className="space-y-1">
            {recentUsers.slice(0, 5).map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-surface-200 transition-colors">
                <Avatar name={u.name} size={32} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-ink-100 truncate">{u.name}</p>
                  <p className="text-[11px] text-ink-400 truncate">{u.email}</p>
                </div>
                <span className="text-[11px] text-ink-400 shrink-0">
                  {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-[15px] font-semibold text-ink-100">Recent searches</h2>
            <Search className="w-4 h-4 text-accent-400" />
          </div>
          <div className="space-y-1">
            {recentSearches.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-surface-200 transition-colors">
                <div className="min-w-0 flex-1 mr-3">
                  <p className="text-[13px] text-ink-100 truncate">{s.prompt}</p>
                  <p className="text-[11px] text-ink-400">{s.userName || 'Guest'}</p>
                </div>
                <span className="text-[11px] text-ink-400 shrink-0">
                  {new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Trending products */}
      <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-[15px] font-semibold text-ink-100">Trending products</h2>
          <TrendingUp className="w-4 h-4 text-accent-400" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {trendingProducts.slice(0, 6).map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-2xl p-2.5 hover:bg-surface-200 transition-colors">
              <img src={p.image} alt={p.name} className="w-12 h-12 rounded-xl object-cover bg-surface-200 border border-line shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-ink-100 truncate">{p.name}</p>
                <p className="text-[11px] text-ink-400">{p.brand}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[13px] font-semibold text-ink-100">{formatPrice(p.price, p.currency)}</p>
                <div className="flex items-center gap-1 justify-end">
                  <Star className="w-3 h-3 fill-warning text-warning" />
                  <span className="text-[11px] text-ink-400">{p.rating}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
