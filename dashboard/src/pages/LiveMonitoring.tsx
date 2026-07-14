import React, { useEffect, useState } from 'react';
import { MapPin, RefreshCw, Clock, User, Navigation } from 'lucide-react';
import api from '../lib/api';

interface Booking {
  id: number;
  serviceType: string;
  status: string;
  pickupAddress: string;
  dropAddress: string;
  estimatedFare: number;
  estimatedDistance: number;
  createdAt: string;
  user?: { fullName: string; mobileNumber: string };
  rider?: { user: { fullName: string }; vehicleRegistrationNumber: string };
}

const statusColors: Record<string, string> = {
  IN_PROGRESS: 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20',
  ACCEPTED: 'bg-sky-400/10 text-sky-300 border border-sky-400/20',
  BIDDING: 'bg-brand-400/10 text-brand-300 border border-brand-400/20',
  RIDER_ARRIVED: 'bg-violet-400/10 text-violet-300 border border-violet-400/20',
};

const LiveMonitoring = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchActiveBookings = async () => {
    try {
      const response = await api.get('/admin/bookings/active');
      setBookings(response.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch active bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveBookings();
    const interval = setInterval(fetchActiveBookings, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-zinc-500">
        Loading live bookings…
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Live Monitoring</h1>
          <p className="text-zinc-500 mt-1 flex items-center text-sm">
            <Clock size={14} className="mr-1.5" />
            Updated {lastUpdated.toLocaleTimeString()} · auto-refresh 10s
          </p>
        </div>
        <button
          onClick={fetchActiveBookings}
          className="flex items-center px-4 py-2.5 bg-brand-400 text-black font-semibold rounded-xl hover:bg-brand-300 transition text-sm"
        >
          <RefreshCw size={16} className="mr-2" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-emerald-400/5 border border-emerald-400/20 rounded-2xl p-5 text-center">
          <p className="text-3xl font-bold text-emerald-300">
            {bookings.filter((b) => b.status === 'IN_PROGRESS').length}
          </p>
          <p className="text-emerald-400/80 text-xs mt-1 uppercase tracking-wider">In Progress</p>
        </div>
        <div className="bg-sky-400/5 border border-sky-400/20 rounded-2xl p-5 text-center">
          <p className="text-3xl font-bold text-sky-300">
            {bookings.filter((b) => b.status === 'ACCEPTED').length}
          </p>
          <p className="text-sky-400/80 text-xs mt-1 uppercase tracking-wider">Accepted / En Route</p>
        </div>
        <div className="bg-brand-400/5 border border-brand-400/20 rounded-2xl p-5 text-center">
          <p className="text-3xl font-bold text-brand-300">
            {bookings.filter((b) => b.status === 'BIDDING').length}
          </p>
          <p className="text-brand-400/80 text-xs mt-1 uppercase tracking-wider">Bidding Open</p>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-ink-900 border border-ink-700 rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4 opacity-60">🏍️</div>
          <h2 className="text-lg font-semibold text-white mb-1">No active rides</h2>
          <p className="text-zinc-500 text-sm">All rides are completed. Monitoring for new activity…</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-ink-900 border border-ink-700 rounded-2xl p-5 hover:border-ink-600 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-zinc-500">#{booking.id}</span>
                <span
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                    statusColors[booking.status] || 'bg-ink-700 text-zinc-300'
                  }`}
                >
                  {booking.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex items-center mb-1">
                <span className="text-[11px] font-bold bg-ink-700 text-zinc-200 px-2 py-0.5 rounded mr-2 uppercase tracking-wide">
                  {booking.serviceType}
                </span>
                <span className="text-zinc-400 text-sm">
                  ₹{booking.estimatedFare?.toFixed(0)} · {booking.estimatedDistance?.toFixed(1)} km
                </span>
              </div>
              <div className="mt-3 space-y-1.5">
                <div className="flex items-start">
                  <MapPin size={14} className="text-emerald-400 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-zinc-300 truncate">{booking.pickupAddress}</p>
                </div>
                <div className="flex items-start">
                  <Navigation size={14} className="text-red-400 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-zinc-300 truncate">{booking.dropAddress}</p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-ink-700 flex justify-between">
                <div className="flex items-center">
                  <User size={13} className="text-zinc-500 mr-1.5" />
                  <span className="text-xs text-zinc-400">{booking.user?.fullName || 'Unknown User'}</span>
                </div>
                {booking.rider && (
                  <span className="text-xs text-zinc-500">🏍️ {booking.rider.user?.fullName}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LiveMonitoring;
