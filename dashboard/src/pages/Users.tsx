import React, { useEffect, useState } from 'react';
import { Search, RefreshCw, User, Phone, Star, CheckCircle2 } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface Rider {
  id: number;
  status: string;
  vehicleType: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleRegistrationNumber: string;
  averageRating: number;
  totalRides: number;
  subscriptionActive: boolean;
  subscriptionEndDate: string;
  user: { fullName: string; mobileNumber: string; createdAt?: string };
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20',
  PENDING: 'bg-brand-400/10 text-brand-300 border border-brand-400/20',
  BANNED: 'bg-red-400/10 text-red-300 border border-red-400/20',
  APPROVED: 'bg-sky-400/10 text-sky-300 border border-sky-400/20',
};

const Users = () => {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [filtered, setFiltered] = useState<Rider[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchRiders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/riders/active');
      setRiders(res.data);
      setFiltered(res.data);
    } catch {
      toast.error('Failed to fetch riders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiders();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      riders.filter(
        (r) =>
          r.user.fullName.toLowerCase().includes(q) ||
          r.user.mobileNumber.includes(q) ||
          r.vehicleRegistrationNumber?.toLowerCase().includes(q),
      ),
    );
  }, [search, riders]);

  if (loading)
    return <div className="flex items-center justify-center h-[60vh] text-zinc-500">Loading…</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Riders</h1>
          <p className="text-zinc-500 mt-1 text-sm">
            {filtered.length} active rider{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={fetchRiders}
          className="flex items-center px-4 py-2.5 bg-brand-400 text-black font-semibold rounded-xl hover:bg-brand-300 transition text-sm"
        >
          <RefreshCw size={16} className="mr-2" />
          Refresh
        </button>
      </div>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          placeholder="Search by name, phone or vehicle number…"
          className="w-full pl-10 pr-4 py-3 bg-ink-900 border border-ink-700 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400 outline-none transition"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-ink-900 border border-ink-700 rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4 opacity-60">🔍</div>
          <h2 className="text-lg font-semibold text-white mb-1">No riders found</h2>
          <p className="text-zinc-500 text-sm">Try adjusting your search.</p>
        </div>
      ) : (
        <div className="bg-ink-900 border border-ink-700 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-850 text-zinc-500 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5 text-left font-medium">Rider</th>
                <th className="px-5 py-3.5 text-left font-medium">Vehicle</th>
                <th className="px-5 py-3.5 text-right font-medium">Rating</th>
                <th className="px-5 py-3.5 text-right font-medium">Rides</th>
                <th className="px-5 py-3.5 text-center font-medium">Subscription</th>
                <th className="px-5 py-3.5 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {filtered.map((rider) => (
                <tr key={rider.id} className="hover:bg-ink-850 transition">
                  <td className="px-5 py-4">
                    <div className="flex items-center">
                      <div className="w-9 h-9 rounded-full bg-brand-400/15 flex items-center justify-center mr-3 flex-shrink-0">
                        <User size={16} className="text-brand-300" />
                      </div>
                      <div>
                        <p className="font-medium text-zinc-100">{rider.user.fullName}</p>
                        <p className="text-zinc-500 flex items-center text-xs mt-0.5">
                          <Phone size={11} className="mr-1" />
                          {rider.user.mobileNumber}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-zinc-200">
                      {rider.vehicleMake} {rider.vehicleModel}
                    </p>
                    <p className="text-zinc-500 text-xs">{rider.vehicleRegistrationNumber}</p>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="flex items-center justify-end text-brand-300 font-semibold">
                      <Star size={13} className="mr-1 fill-brand-400 text-brand-400" />
                      {rider.averageRating?.toFixed(1) || '5.0'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right text-zinc-300 font-medium">
                    {rider.totalRides || 0}
                  </td>
                  <td className="px-5 py-4 text-center">
                    {rider.subscriptionActive ? (
                      <span className="inline-flex items-center justify-center text-emerald-400 text-xs">
                        <CheckCircle2 size={13} className="mr-1" /> Active
                      </span>
                    ) : (
                      <span className="text-red-400 text-xs">Inactive</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                        statusColors[rider.status] || 'bg-ink-700 text-zinc-300'
                      }`}
                    >
                      {rider.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Users;
