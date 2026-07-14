import React, { useEffect, useState } from 'react';
import { Users, Bike, DollarSign, Activity, AlertCircle, ArrowUpRight } from 'lucide-react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../lib/api';

interface DashboardStats {
  totalUsers: number;
  totalRiders: number;
  activeRiders: number;
  pendingRiders: number;
  todayBookings: number;
  activeBookings: number;
  todayRevenue: number;
}

const chartTooltip = {
  contentStyle: {
    background: '#161618',
    border: '1px solid #27272a',
    borderRadius: 12,
    color: '#fafafa',
    fontSize: 12,
  },
  labelStyle: { color: '#a1a1aa' },
  cursor: { fill: 'rgba(255,255,255,0.06)' },
};

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
    const interval = setInterval(fetchDashboardStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/admin/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Total Users', value: stats?.totalUsers ?? 0, icon: Users, change: '+12%', tint: 'text-sky-400 bg-sky-400/10' },
    { title: 'Active Riders', value: stats?.activeRiders ?? 0, icon: Bike, change: '+8%', tint: 'text-emerald-400 bg-emerald-400/10' },
    { title: "Today's Bookings", value: stats?.todayBookings ?? 0, icon: Activity, change: '+23%', tint: 'text-violet-400 bg-violet-400/10' },
    { title: "Today's Revenue", value: `₹${stats?.todayRevenue ?? 0}`, icon: DollarSign, change: '+15%', tint: 'text-brand-400 bg-brand-400/10' },
  ];

  const bookingData = [
    { name: 'Mon', bookings: 45, revenue: 4500 },
    { name: 'Tue', bookings: 52, revenue: 5200 },
    { name: 'Wed', bookings: 48, revenue: 4800 },
    { name: 'Thu', bookings: 61, revenue: 6100 },
    { name: 'Fri', bookings: 70, revenue: 7000 },
    { name: 'Sat', bookings: 85, revenue: 8500 },
    { name: 'Sun', bookings: 78, revenue: 7800 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-zinc-500">
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Overview</h1>
        <p className="text-zinc-500 mt-1 text-sm">Real-time snapshot of the Flux platform</p>
      </div>

      {!!stats?.pendingRiders && stats.pendingRiders > 0 && (
        <div className="bg-brand-400/10 border border-brand-400/30 rounded-2xl p-4 mb-6 flex items-center">
          <AlertCircle className="text-brand-400 mr-3 flex-shrink-0" size={20} />
          <div>
            <p className="text-brand-200 font-semibold text-sm">
              {stats.pendingRiders} rider application{stats.pendingRiders !== 1 ? 's' : ''} pending review
            </p>
            <p className="text-zinc-400 text-xs mt-0.5">
              Head to “Rider Verification” to review and approve them.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((stat, index) => (
          <div
            key={index}
            className="bg-ink-900 border border-ink-700 rounded-2xl p-5 hover:border-ink-600 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 rounded-xl ${stat.tint}`}>
                <stat.icon size={20} strokeWidth={2.2} />
              </div>
              <span className="text-emerald-400 text-xs font-semibold flex items-center gap-0.5">
                <ArrowUpRight size={13} />
                {stat.change}
              </span>
            </div>
            <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">{stat.title}</p>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-ink-900 border border-ink-700 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-5">Weekly Bookings</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={bookingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip {...chartTooltip} />
              <Bar dataKey="bookings" fill="#fafafa" radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-ink-900 border border-ink-700 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-5">Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={bookingData}>
              <defs>
                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip {...chartTooltip} />
              <Area type="monotone" dataKey="revenue" stroke="#34d399" strokeWidth={2.5} fill="url(#revFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-ink-900 border border-ink-700 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-5">Service Distribution</h2>
          <div className="space-y-4">
            {[
              { label: 'Rides', pct: 65, color: 'bg-brand-400' },
              { label: 'Errands', pct: 25, color: 'bg-emerald-400' },
              { label: 'Parcels', pct: 10, color: 'bg-violet-400' },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-zinc-400 text-sm">{s.label}</span>
                  <span className="font-semibold text-zinc-200 text-sm">{s.pct}%</span>
                </div>
                <div className="w-full bg-ink-700 rounded-full h-2">
                  <div className={`${s.color} h-2 rounded-full`} style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-ink-900 border border-ink-700 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-5">Top Riders</h2>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-ink-700 rounded-full flex items-center justify-center mr-3 text-xs font-bold text-brand-300">
                    {i}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">Rider {i}</p>
                    <p className="text-xs text-zinc-500">{50 - i * 5} rides</p>
                  </div>
                </div>
                <div className="flex items-center text-sm font-semibold text-brand-300">
                  <span className="mr-1">★</span>
                  {(5 - i * 0.1).toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-ink-900 border border-ink-700 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-5">Recent Activity</h2>
          <div className="space-y-4">
            {[
              { c: 'bg-emerald-400', t: 'New rider approved', s: '2 minutes ago' },
              { c: 'bg-sky-400', t: 'Booking completed', s: '5 minutes ago' },
              { c: 'bg-brand-400', t: 'New rider application', s: '10 minutes ago' },
              { c: 'bg-violet-400', t: 'Payment received', s: '15 minutes ago' },
            ].map((a, i) => (
              <div key={i} className="flex items-start">
                <div className={`w-2 h-2 ${a.c} rounded-full mt-1.5 mr-3 flex-shrink-0`} />
                <div>
                  <p className="text-sm text-zinc-200">{a.t}</p>
                  <p className="text-xs text-zinc-500">{a.s}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
