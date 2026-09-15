import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../lib/api';
import { Search, Filter, MapPin, Calendar, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

// All booking statuses supported by the backend BookingStatus enum
const ALL_STATUSES = [
  { value: '', label: 'All Status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'BIDDING', label: 'Bidding' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'RIDER_EN_ROUTE', label: 'Rider En Route' },
  { value: 'RIDER_ARRIVED', label: 'Rider Arrived' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED_BY_USER', label: 'Cancelled by User' },
  { value: 'CANCELLED_BY_RIDER', label: 'Cancelled by Rider' },
  { value: 'NO_RIDERS_AVAILABLE', label: 'No Riders' },
];

export default function BookingsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ['bookings', statusFilter, searchQuery],
    queryFn: () => adminApi.getBookings({ status: statusFilter, search: searchQuery }),
    // React Query handles stale/refetch — we supplement with a 30s interval below
    staleTime: 30_000,
  });

  // 30-second auto-refresh
  const handleRefetch = useCallback(() => {
    refetch();
    setLastRefreshed(new Date());
  }, [refetch]);

  useEffect(() => {
    const interval = setInterval(handleRefetch, 30_000);
    return () => clearInterval(interval);
  }, [handleRefetch]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-400/10 text-yellow-300 border border-yellow-400/20',
      BIDDING: 'bg-orange-400/10 text-orange-300 border border-orange-400/20',
      ACCEPTED: 'bg-sky-400/10 text-sky-300 border border-sky-400/20',
      RIDER_EN_ROUTE: 'bg-blue-400/10 text-blue-300 border border-blue-400/20',
      RIDER_ARRIVED: 'bg-violet-400/10 text-violet-300 border border-violet-400/20',
      IN_PROGRESS: 'bg-indigo-400/10 text-indigo-300 border border-indigo-400/20',
      COMPLETED: 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20',
      CANCELLED_BY_USER: 'bg-red-400/10 text-red-300 border border-red-400/20',
      CANCELLED_BY_RIDER: 'bg-red-400/10 text-red-300 border border-red-400/20',
      NO_RIDERS_AVAILABLE: 'bg-zinc-400/10 text-zinc-400 border border-zinc-400/20',
      CANCELLED: 'bg-red-400/10 text-red-300 border border-red-400/20',
    };
    return styles[status] || 'bg-zinc-800 text-zinc-400';
  };

  const th = 'px-6 py-3.5 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider';

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Booking Management</h1>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span>Auto-refresh every 30s · Last: {format(lastRefreshed, 'HH:mm:ss')}</span>
          <button
            onClick={handleRefetch}
            className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
            title="Refresh now"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl mb-6 p-4">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by booking ID, user, rider…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-white/20 focus:border-zinc-500 outline-none"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-zinc-100 focus:ring-2 focus:ring-white/20 focus:border-zinc-500 outline-none appearance-none"
            >
              {ALL_STATUSES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-zinc-500">Loading bookings…</div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-zinc-800/50">
              <tr>
                <th className={th}>Booking ID</th>
                <th className={th}>User</th>
                <th className={th}>Rider</th>
                <th className={th}>Route</th>
                <th className={th}>Fare</th>
                <th className={th}>Status</th>
                <th className={th}>Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {bookings?.data?.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500 text-sm">
                    No bookings found.
                  </td>
                </tr>
              )}
              {bookings?.data?.map((booking: any) => (
                <tr key={booking.id} className="hover:bg-zinc-800/40 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-zinc-100">
                    #{booking.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-zinc-100">{booking.user?.fullName}</div>
                    <div className="text-sm text-zinc-500">{booking.user?.mobileNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {booking.rider ? (
                      <div>
                        <div className="text-sm font-medium text-zinc-100">
                          {booking.rider?.user?.fullName}
                        </div>
                        <div className="text-sm text-zinc-500">
                          {booking.rider?.vehicleRegistrationNumber}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-500">Not assigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-2 max-w-xs">
                      <MapPin className="w-4 h-4 text-zinc-500 mt-1 flex-shrink-0" />
                      <div className="text-sm text-zinc-200">
                        <div className="truncate" title={booking.pickupAddress}>
                          {booking.pickupAddress?.substring(0, 30) || '—'}
                        </div>
                        <div className="truncate text-zinc-500" title={booking.dropAddress || booking.dropoffAddress}>
                          → {(booking.dropAddress || booking.dropoffAddress)?.substring(0, 30) || '—'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-white">
                    ₹{booking.finalFare || booking.estimatedFare || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2.5 inline-flex text-[11px] leading-5 font-semibold rounded-full ${getStatusBadge(booking.status)}`}
                    >
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-zinc-300">
                      <Calendar className="w-4 h-4 mr-2 text-zinc-500" />
                      {booking.createdAt
                        ? format(new Date(booking.createdAt), 'MMM dd, yyyy')
                        : 'N/A'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
