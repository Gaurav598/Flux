import React, { useEffect, useState } from 'react';
import { RefreshCw, Search, MapPin, Navigation, User } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface Booking {
  id: number;
  serviceType: string;
  status: string;
  pickupAddress: string;
  dropAddress: string;
  estimatedFare: number;
  finalFare?: number;
  estimatedDistance: number;
  createdAt: string;
  user?: { fullName: string; mobileNumber: string };
  rider?: { user: { fullName: string }; vehicleRegistrationNumber: string };
}

const statusColors: Record<string, string> = {
  IN_PROGRESS: 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20',
  COMPLETED: 'bg-sky-400/10 text-sky-300 border border-sky-400/20',
  ACCEPTED: 'bg-indigo-400/10 text-indigo-300 border border-indigo-400/20',
  BIDDING: 'bg-brand-400/10 text-brand-300 border border-brand-400/20',
  RIDER_ARRIVED: 'bg-violet-400/10 text-violet-300 border border-violet-400/20',
  CANCELLED_BY_USER: 'bg-red-400/10 text-red-300 border border-red-400/20',
  CANCELLED_BY_RIDER: 'bg-orange-400/10 text-orange-300 border border-orange-400/20',
};

const Bookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filtered, setFiltered] = useState<Booking[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/bookings/active');
      setBookings(res.data);
      setFiltered(res.data);
    } catch {
      toast.error('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      bookings.filter(
        (b) =>
          String(b.id).includes(q) ||
          b.pickupAddress?.toLowerCase().includes(q) ||
          b.dropAddress?.toLowerCase().includes(q) ||
          b.user?.fullName?.toLowerCase().includes(q),
      ),
    );
  }, [search, bookings]);

  if (loading)
    return <div className="flex items-center justify-center h-[60vh] text-zinc-500">Loading…</div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Bookings</h1>
          <p className="text-zinc-500 mt-1 text-sm">
            {filtered.length} active booking{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={fetchBookings}
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
          placeholder="Search by booking ID, address, or user…"
          className="w-full pl-10 pr-4 py-3 bg-ink-900 border border-ink-700 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400 outline-none transition"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-ink-900 border border-ink-700 rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4 opacity-60">📋</div>
          <h2 className="text-lg font-semibold text-white mb-1">No bookings found</h2>
          <p className="text-zinc-500 text-sm">No active bookings at the moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((booking) => (
            <div
              key={booking.id}
              className="bg-ink-900 border border-ink-700 rounded-2xl p-5 hover:border-ink-600 transition-colors"
            >
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="font-mono text-zinc-500 text-xs">#{booking.id}</span>
                    <span className="text-[11px] font-bold bg-ink-700 text-zinc-200 px-2 py-0.5 rounded uppercase tracking-wide">
                      {booking.serviceType}
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                        statusColors[booking.status] || 'bg-ink-700 text-zinc-300'
                      }`}
                    >
                      {booking.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center">
                      <MapPin size={13} className="text-emerald-400 mr-2 flex-shrink-0" />
                      <p className="text-sm text-zinc-300 truncate">{booking.pickupAddress}</p>
                    </div>
                    <div className="flex items-center">
                      <Navigation size={13} className="text-red-400 mr-2 flex-shrink-0" />
                      <p className="text-sm text-zinc-300 truncate">{booking.dropAddress}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-bold text-brand-300">
                    ₹{(booking.finalFare ?? booking.estimatedFare)?.toFixed(0)}
                  </p>
                  <p className="text-xs text-zinc-500">{booking.estimatedDistance?.toFixed(1)} km</p>
                  <p className="text-[11px] text-zinc-600 mt-1">
                    {new Date(booking.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-ink-700 flex justify-between items-center text-xs text-zinc-500">
                <span className="flex items-center">
                  <User size={12} className="mr-1.5" />
                  {booking.user?.fullName || 'Unknown'}
                  {booking.user?.mobileNumber ? ` · ${booking.user.mobileNumber}` : ''}
                </span>
                {booking.rider ? (
                  <span className="text-zinc-400">
                    🏍️ {booking.rider.user?.fullName} · {booking.rider.vehicleRegistrationNumber}
                  </span>
                ) : (
                  <span className="text-brand-300">Awaiting rider</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Bookings;
