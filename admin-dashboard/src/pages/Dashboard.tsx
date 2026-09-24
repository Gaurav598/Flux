import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../lib/api';
import { Users, Car, FileText, Activity, TrendingUp, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { data: analytics, isLoading, isError } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => adminApi.getAnalytics(),
    staleTime: 30_000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        Loading analytics…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-500">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p>Failed to load analytics. Check backend connection.</p>
      </div>
    );
  }

  const stats = analytics?.data || {};

  const statCards = [
    {
      title: 'Total Users',
      value: (stats.totalUsers ?? 0).toLocaleString(),
      icon: Users,
      tint: 'text-sky-400 bg-sky-400/10',
    },
    {
      title: 'Total Riders',
      value: (stats.totalRiders ?? 0).toLocaleString(),
      icon: Car,
      tint: 'text-emerald-400 bg-emerald-400/10',
    },
    {
      title: 'Total Bookings',
      value: (stats.totalBookings ?? 0).toLocaleString(),
      icon: FileText,
      tint: 'text-violet-400 bg-violet-400/10',
    },
    {
      title: "Today's Bookings",
      value: (stats.todayBookings ?? 0).toLocaleString(),
      icon: Activity,
      tint: 'text-orange-400 bg-orange-400/10',
    },
  ];

  const chartData = Array.isArray(stats.dailyBookings)
    ? stats.dailyBookings.map((item: {date: string; bookings: number}) => ({
        name: new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, {
          weekday: 'short',
        }),
        bookings: item.bookings,
      }))
    : [];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white tracking-tight mb-8">Dashboard Overview</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${stat.tint}`}>
                  <Icon className="w-5 h-5" strokeWidth={2.2} />
                </div>
                <TrendingUp className="w-4 h-4 text-zinc-600" />
              </div>
              <h3 className="text-zinc-500 text-xs uppercase tracking-wider mb-1">{stat.title}</h3>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Active Riders</p>
          <p className="text-xl font-bold text-emerald-400">{stats.activeRiders ?? 0}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Pending Riders</p>
          <p className="text-xl font-bold text-yellow-400">{stats.pendingRiders ?? 0}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Today Revenue</p>
          <p className="text-xl font-bold text-white">₹{(stats.todayRevenue ?? 0).toLocaleString()}</p>
          <p className="text-[10px] text-zinc-600 mt-1">Payments disabled (Stripe)</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Active Bookings</p>
          <p className="text-xl font-bold text-indigo-400">{stats.activeBookings ?? 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-zinc-300">Weekly Bookings</h2>
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Backend booking records · last 7 days</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: '#161618',
                  border: '1px solid #27272a',
                  borderRadius: 12,
                  color: '#fafafa',
                  fontSize: 12,
                }}
                cursor={{ fill: 'rgba(255,255,255,0.06)' }}
              />
              <Bar dataKey="bookings" fill="#fafafa" radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-5">Platform Status</h2>
          <div className="space-y-4">
            {[
              { label: 'Total Registered Users', value: stats.totalUsers ?? 0, color: 'text-sky-400' },
              { label: 'Total Riders', value: stats.totalRiders ?? 0, color: 'text-emerald-400' },
              { label: 'Active Riders (online)', value: stats.activeRiders ?? 0, color: 'text-green-400' },
              { label: 'Pending Rider Approvals', value: stats.pendingRiders ?? 0, color: 'text-yellow-400' },
              { label: 'All-time Bookings', value: stats.totalBookings ?? 0, color: 'text-violet-400' },
              { label: "Today's Bookings", value: stats.todayBookings ?? 0, color: 'text-orange-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                <span className="text-sm text-zinc-400">{label}</span>
                <span className={`text-sm font-bold ${color}`}>{value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
