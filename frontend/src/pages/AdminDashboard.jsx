import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { admin } from '../services/api';
import {
  Users, Eye, Activity, AlertTriangle, ShoppingBag, Cpu, Clock, BarChart3,
  ChevronLeft, ChevronRight, Search, ExternalLink, Loader2, TrendingUp, TrendingDown,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

const COLORS = ['#22c55e', '#06b6d4', '#a855f7', '#ec4899', '#f97316', '#eab308', '#6366f1', '#ef4444'];

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

function KPI({ icon: Icon, label, value, sub, color = 'teal' }) {
  const colors = {
    teal: 'bg-teal-500/10 border-teal-500/20 text-teal-400',
    cyan: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
    violet: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
    rose: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    indigo: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
  };
  return (
    <motion.div variants={fadeUp} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03]">
          <Icon className={`h-5 w-5 ${colors[color]?.split(' ').pop() || 'text-teal-400'}`} />
        </div>
      </div>
      <div className="mt-4">
        <div className="text-2xl font-semibold text-white">{typeof value === 'number' ? value.toLocaleString() : value ?? '—'}</div>
        <div className="mt-1 text-xs text-white/40">{label}</div>
        {sub && <div className="mt-0.5 text-[10px] text-white/25">{sub}</div>}
      </div>
    </motion.div>
  );
}

function Section({ title, children, className = '' }) {
  return (
    <motion.div variants={fadeUp} className={`rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-7 ${className}`}>
      <h3 className="mb-5 text-sm font-semibold uppercase tracking-wider text-white/50">{title}</h3>
      {children}
    </motion.div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#0e0e16] px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 text-white/40">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-white/70">{p.name}:</span>
          <span className="font-medium text-white">{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
        </div>
      ))}
    </div>
  );
}

function Pagination({ page, totalPages, onPageChange }) {
  return (
    <div className="mt-4 flex items-center justify-center gap-2">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-1.5 text-white/40 transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-30"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="text-xs text-white/40">Page {page} of {totalPages}</span>
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-1.5 text-white/40 transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-30"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function ErrorRow({ e }) {
  return (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
      <td className="px-4 py-3 text-xs text-white/50">{new Date(e.createdAt).toLocaleString()}</td>
      <td className="px-4 py-3">
        <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-400">{e.statusCode || '—'}</span>
      </td>
      <td className="px-4 py-3 text-xs text-white/50 max-w-[200px] truncate">{e.endpoint}</td>
      <td className="px-4 py-3 text-xs text-white/50 max-w-[300px] truncate">{e.message}</td>
      <td className="px-4 py-3">
        <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
          e.category === 'analysis_error' ? 'bg-amber-500/10 text-amber-400' :
          e.category === 'server_error' ? 'bg-rose-500/10 text-rose-400' :
          'bg-white/5 text-white/40'
        }`}>{e.category}</span>
      </td>
      <td className="px-4 py-3 text-xs text-white/30">{e.marketplace || '—'}</td>
    </tr>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [errPage, setErrPage] = useState(1);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [days, setDays] = useState(30);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
    if (!token || adminUser.role !== 'admin') {
      navigate('/admin/login');
    }
  }, [navigate]);

  const { data: dashData, isLoading: dashLoading } = useQuery({
    queryKey: ['admin-analytics', days],
    queryFn: () => admin.getAnalytics({ days }).then((r) => r.data),
    refetchInterval: 60000,
  });

  const { data: usersData } = useQuery({
    queryKey: ['admin-users', page],
    queryFn: () => admin.getAnalyticsUsers({ page, limit: 10 }).then((r) => r.data),
  });

  const { data: analysesData } = useQuery({
    queryKey: ['admin-analyses', page],
    queryFn: () => admin.getAnalyses({ page, limit: 15 }).then((r) => r.data),
  });

  const { data: marketplaceData } = useQuery({
    queryKey: ['admin-marketplaces', days],
    queryFn: () => admin.getMarketplaceStats({ days }).then((r) => r.data),
  });

  const { data: aiData } = useQuery({
    queryKey: ['admin-ai-usage', days],
    queryFn: () => admin.getAIUsage({ days }).then((r) => r.data),
  });

  const { data: errorsData } = useQuery({
    queryKey: ['admin-errors', errPage],
    queryFn: () => admin.getErrors({ page: errPage, limit: 10 }).then((r) => r.data),
  });

  const { data: decisionsListData } = useQuery({
    queryKey: ['admin-decisionsList', days],
    queryFn: () => admin.getDecisions({ days }).then((r) => r.data),
  });

  const { data: topProducts } = useQuery({
    queryKey: ['admin-top-products', days],
    queryFn: () => admin.getTopProducts({ days, limit: 10 }).then((r) => r.data),
  });

  const dashboard = dashData || {};
  const users = usersData?.users || [];
  const analyses = analysesData?.analyses || [];
  const totalAnalysesCount = analysesData?.pagination?.total || 0;
  const marketplace = Array.isArray(marketplaceData) ? marketplaceData : [];
  const aiUsageDaily = aiData?.daily || [];
  const errors = errorsData?.errors || [];
  const totalErrors = errorsData?.pagination?.total || 0;
  const decisionsListList = decisionsList?.decisionsList || [];
  const topProds = topProducts || {};

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'users', label: 'Users' },
    { key: 'analyses', label: 'Analyses' },
    { key: 'marketplaces', label: 'Marketplaces' },
    { key: 'ai', label: 'AI Usage' },
    { key: 'errors', label: 'Errors' },
    { key: 'products', label: 'Top Products' },
  ];

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(u => u.email?.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q));
  }, [users, searchQuery]);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        <motion.div initial="hidden" animate="show" variants={stagger}>
          {/* Header */}
          <motion.div variants={fadeUp} className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-semibold text-white">Admin Dashboard</h1>
              <p className="mt-1 text-sm text-white/40">Monitor your application performance</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-white/60 outline-none focus:border-teal-500/40"
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
              {dashLoading && <Loader2 className="h-4 w-4 animate-spin text-teal-400" />}
            </div>
          </motion.div>

          {/* KPI Cards */}
          <motion.div variants={fadeUp} className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
            <KPI icon={ShoppingBag} label="Total Analyses" value={dashboard.totalAnalyses} color="teal" />
            <KPI icon={Eye} label="Unique Visitors" value={dashboard.uniqueVisitors} color="cyan" />
            <KPI icon={Users} label="Registered Users" value={dashboard.totalUsers} color="violet" />
            <KPI icon={Cpu} label="AI Requests" value={dashboard.totalAIRequests} color="indigo" />
            <KPI icon={Clock} label="Avg Duration" value={dashboard.avgDurationMs ? `${(dashboard.avgDurationMs / 1000).toFixed(1)}s` : null} color="amber" />
            <KPI icon={AlertTriangle} label="Errors" value={dashboard.errorCount} color="rose" />
          </motion.div>

          {/* Tab Nav */}
          <motion.div variants={fadeUp} className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`whitespace-nowrap rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
                  activeTab === t.key ? 'bg-teal-500/15 text-teal-400' : 'text-white/40 hover:text-white/60'
                }`}
              >
                {t.label}
              </button>
            ))}
          </motion.div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid gap-5 lg:grid-cols-2">
              {/* Analysis Trend */}
              <Section title="Analysis Trend">
                {dashboard.dailyAnalyses?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={dashboard.dailyAnalyses}>
                      <defs>
                        <linearGradient id="gradAnalyses" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} tickFormatter={(d) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
                      <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="count" name="Analyses" stroke="#22c55e" fill="url(#gradAnalyses)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <div className="flex h-[220px] items-center justify-center text-xs text-white/20">No data</div>}
              </Section>

              {/* Marketplace Distribution */}
              <Section title="Marketplace Distribution">
                {marketplace.length > 0 ? (
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width="50%" height={200}>
                      <PieChart>
                        <Pie data={marketplace} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={3}>
                          {marketplace.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {marketplace.slice(0, 6).map((m, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="flex-1 text-xs text-white/50">{m.name}</span>
                          <span className="text-xs font-medium text-white/70">{m.total}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : <div className="flex h-[200px] items-center justify-center text-xs text-white/20">No data</div>}
              </Section>

              {/* AI Usage Trend */}
              <Section title="AI Requests Over Time">
                {aiUsageDaily.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={aiUsageDaily}>
                      <defs>
                        <linearGradient id="gradAI" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} tickFormatter={(d) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
                      <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="count" name="AI Requests" stroke="#a855f7" fill="url(#gradAI)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <div className="flex h-[220px] items-center justify-center text-xs text-white/20">No data</div>}
              </Section>

              {/* Decision Stats */}
              <Section title="Verdict Distribution">
                {decisionsList.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={decisionsList}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="verdict" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} />
                      <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="count" name="Count" radius={[4, 4, 0, 0]}>
                        {decisionsList.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="flex h-[220px] items-center justify-center text-xs text-white/20">No data</div>}
              </Section>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <Section title="Registered Users">
              <div className="mb-4 flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/25" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] py-2 pl-9 pr-3 text-xs text-white placeholder-white/25 outline-none focus:border-teal-500/40"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">User</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Email</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Role</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Analyses</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-xs text-white/60">{u.name || '—'}</td>
                        <td className="px-4 py-3 text-xs text-white/50">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                            u.role === 'admin' ? 'bg-teal-500/10 text-teal-400' : 'bg-white/5 text-white/40'
                          }`}>{u.role}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-white/40">{u._count?.analyses ?? u.analysisCount ?? 0}</td>
                        <td className="px-4 py-3 text-xs text-white/30">{new Date(u.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-white/20">No users found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {usersData?.pagination && <Pagination page={usersData.pagination.page} totalPages={usersData.pagination.totalPages} onPageChange={setPage} />}
            </Section>
          )}

          {/* Analyses Tab */}
          {activeTab === 'analyses' && (
            <Section title="Recent Analyses">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Date</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">User</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Marketplace</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Duration</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Cache</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analyses.map((a) => (
                      <tr key={a.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-xs text-white/50">{new Date(a.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-3 text-xs text-white/50">{a.user?.email || a.userId?.slice(0, 8) || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/40">{a.marketplace || '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-white/40">{a.durationMs ? `${(a.durationMs / 1000).toFixed(1)}s` : '—'}</td>
                        <td className="px-4 py-3">
                          {a.cacheHit ? (
                            <span className="rounded-md bg-teal-500/10 px-2 py-0.5 text-[10px] font-medium text-teal-400">HIT</span>
                          ) : (
                            <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/30">MISS</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                            a.status === 'completed' ? 'bg-teal-500/10 text-teal-400' :
                            a.status === 'failed' ? 'bg-rose-500/10 text-rose-400' :
                            'bg-amber-500/10 text-amber-400'
                          }`}>{a.status}</span>
                        </td>
                      </tr>
                    ))}
                    {analyses.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-white/20">No analyses yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {analysesData?.pagination && <Pagination page={analysesData.pagination.page} totalPages={analysesData.pagination.totalPages} onPageChange={setPage} />}
            </Section>
          )}

          {/* Marketplaces Tab */}
          {activeTab === 'marketplaces' && (
            <Section title="Marketplace Performance">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Marketplace</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Total</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Completed</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Avg Duration</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Success Rate</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Failed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marketplace.map((m) => (
                      <tr key={m.name} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-xs font-medium text-white/60">{m.name}</td>
                        <td className="px-4 py-3 text-xs text-white/50">{m.total}</td>
                        <td className="px-4 py-3 text-xs text-white/40">{m.completed}</td>
                        <td className="px-4 py-3 text-xs text-white/40">{m.avgDuration ? `${(m.avgDuration / 1000).toFixed(1)}s` : '—'}</td>
                        <td className="px-4 py-3 text-xs text-white/40">{m.successRate ? `${m.successRate}%` : '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs ${m.failed > 0 ? 'text-rose-400' : 'text-white/40'}`}>
                            {m.failed || 0}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {marketplace.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-white/20">No marketplace data yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* AI Usage Tab */}
          {activeTab === 'ai' && (
            <div className="grid gap-5 lg:grid-cols-2">
              <Section title="AI Requests Over Time">
                {aiUsageDaily.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={aiUsageDaily}>
                      <defs>
                        <linearGradient id="gradAI2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} tickFormatter={(d) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
                      <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="count" name="AI Requests" stroke="#a855f7" fill="url(#gradAI2)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <div className="flex h-[260px] items-center justify-center text-xs text-white/20">No data</div>}
              </Section>

              <Section title="AI Breakdown">
                {aiData?.byModel?.length > 0 ? (
                  <div className="space-y-3">
                    {aiData.byModel.map((m, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="flex-1 text-xs text-white/50">{m.model || m.requestType}</span>
                        <span className="text-xs font-medium text-white/70">{m.count} requests</span>
                        {m.avgDurationMs && <span className="text-[10px] text-white/30">~{(m.avgDurationMs / 1000).toFixed(1)}s</span>}
                      </div>
                    ))}
                  </div>
                ) : <div className="flex h-[200px] items-center justify-center text-xs text-white/20">No AI data yet</div>}
              </Section>
            </div>
          )}

          {/* Errors Tab */}
          {activeTab === 'errors' && (
            <Section title="Error Logs">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Time</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Status</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Endpoint</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Message</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Category</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Marketplace</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errors.map((e) => <ErrorRow key={e.id} e={e} />)}
                    {errors.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-white/20">No errors recorded</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {errorsData?.pagination && <Pagination page={errorsData.pagination.page} totalPages={errorsData.pagination.totalPages} onPageChange={setErrPage} />}
            </Section>
          )}

          {/* Top Products Tab */}
          {activeTab === 'products' && (
            <Section title="Most Analyzed Products">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">#</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Product</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Marketplace</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Analyses</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white/30">Last Analyzed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProds.map((p, i) => (
                      <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-xs text-white/30">{i + 1}</td>
                        <td className="px-4 py-3 text-xs text-white/60 max-w-[300px] truncate">{p.name || p.url || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-medium text-white/40">{p.marketplace || '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-white/50">{p.count}</td>
                        <td className="px-4 py-3 text-xs text-white/30">{p.lastAnalyzed ? new Date(p.lastAnalyzed).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                    {topProds.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-white/20">No product data yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Section>
          )}
        </motion.div>
      </div>
    </div>
  );
}
