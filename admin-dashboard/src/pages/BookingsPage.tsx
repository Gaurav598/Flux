import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../lib/api';
import { Search, Filter, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function BookingsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['bookings', statusFilter, searchQuery],
    queryFn: () => adminApi.getBookings({ status: statusFilter, search: searchQuery }),
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-brand-400/10 text-brand-300 border border-brand-400/20',
      ACCEPTED: 'bg-sky-400/10 text-sky-300 border border-sky-400/20',
      RIDER_ARRIVED: 'bg-violet-400/10 text-violet-300 border border-violet-400/20',
      IN_PROGRESS: 'bg-indigo-400/10 text-indigo-300 border border-indigo-400/20',
      COMPLETED: 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20',
      CANCELLED: 'bg-red-400/10 text-red-300 border border-red-400/20',
    };
    return styles[status as keyof typeof styles] || 'bg-ink-700 text-zinc-400';
  };

  const th = 'px-6 py-3.5 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider';

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white tracking-tight mb-8">Booking Management</h1>

      <div className="bg-ink-900 border border-ink-700 rounded-2xl mb-6 p-4">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by booking ID, user, rider…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-ink-850 border border-ink-700 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400 outline-none"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2.5 bg-ink-850 border border-ink-700 rounded-xl text-sm text-zinc-100 focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400 outline-none appearance-none"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="RIDER_ARRIVED">Rider Arrived</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-zinc-500">Loading bookings…</div>
      ) : (
        <div className="bg-ink-900 border border-ink-700 rounded-2xl overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-ink-850">
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
            <tbody className="divide-y divide-ink-700">
              {bookings?.data?.map((booking: any) => (
                <tr key={booking.id} className="hover:bg-ink-850 transition">
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
                        <div className="text-sm font-medium text-zinc-100">{booking.rider?.user?.fullName}</div>
                        <div className="text-sm text-zinc-500">{booking.rider?.vehicleRegistrationNumber}</div>
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-500">Not assigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-2 max-w-xs">
                      <MapPin className="w-4 h-4 text-zinc-500 mt-1 flex-shrink-0" />
                      <div className="text-sm text-zinc-200">
                        <div className="truncate">{booking.pickupAddress?.substring(0, 30)}...</div>
                        <div className="truncate text-zinc-500">to {booking.dropoffAddress?.substring(0, 30)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-brand-300">
                    ₹{booking.finalFare || booking.estimatedFare || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 inline-flex text-[11px] leading-5 font-semibold rounded-full ${getStatusBadge(booking.status)}`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-zinc-300">
                      <Calendar className="w-4 h-4 mr-2 text-zinc-500" />
                      {booking.createdAt ? format(new Date(booking.createdAt), 'MMM dd, yyyy') : 'N/A'}
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
