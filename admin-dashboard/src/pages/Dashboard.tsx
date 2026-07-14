import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../lib/api';
import { Users, Car, FileText, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => adminApi.getAnalytics(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        Loading analytics…
      </div>
    );
  }

  const stats = analytics?.data || {};

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers || 0, icon: Users, change: '+12%', isPositive: true, tint: 'text-sky-400 bg-sky-400/10' },
    { title: 'Active Riders', value: stats.totalRiders || 0, icon: Car, change: '+8%', isPositive: true, tint: 'text-emerald-400 bg-emerald-400/10' },
    { title: 'Total Bookings', value: stats.totalBookings || 0, icon: FileText, change: '+15%', isPositive: true, tint: 'text-violet-400 bg-violet-400/10' },
    { title: 'Total Revenue', value: `₹${(stats.totalRevenue || 0).toLocaleString()}`, icon: DollarSign, change: '+20%', isPositive: true, tint: 'text-brand-400 bg-brand-400/10' },
  ];

  const chartData = [
    { name: 'Mon', bookings: 45 },
    { name: 'Tue', bookings: 52 },
    { name: 'Wed', bookings: 38 },
    { name: 'Thu', bookings: 63 },
    { name: 'Fri', bookings: 71 },
    { name: 'Sat', bookings: 89 },
    { name: 'Sun', bookings: 82 },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white tracking-tight mb-8">Dashboard Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const TrendIcon = stat.isPositive ? TrendingUp : TrendingDown;
          return (
            <div
              key={stat.title}
              className="bg-ink-900 border border-ink-700 rounded-2xl p-5 hover:border-ink-600 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${stat.tint}`}>
                  <Icon className="w-5 h-5" strokeWidth={2.2} />
                </div>
                <div className={`flex items-center ${stat.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  <TrendIcon className="w-4 h-4 mr-1" />
                  <span className="text-xs font-semibold">{stat.change}</span>
                </div>
              </div>
              <h3 className="text-zinc-500 text-xs uppercase tracking-wider mb-1">{stat.title}</h3>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-ink-900 border border-ink-700 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-5">Weekly Bookings</h2>
          <ResponsiveContainer width="100%" height={300}>
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

        <div className="bg-ink-900 border border-ink-700 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-5">Recent Activity</h2>
          <div className="space-y-1">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="flex items-center py-3 border-b border-ink-700 last:border-0">
                <div className="w-10 h-10 bg-brand-400/10 rounded-full flex items-center justify-center mr-4">
                  <FileText className="w-5 h-5 text-brand-300" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-200">New booking #10{item}4</p>
                  <p className="text-xs text-zinc-500">{item * 5} minutes ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
