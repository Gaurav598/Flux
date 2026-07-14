import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../lib/api';
import { Search, Filter, CheckCircle, XCircle, Ban, PlayCircle } from 'lucide-react';

export default function RidersPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const { data: riders, isLoading } = useQuery({
    queryKey: ['riders', statusFilter, searchQuery],
    queryFn: () => adminApi.getRiders({ status: statusFilter, search: searchQuery }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => adminApi.approveRider(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['riders'] });
      alert('Rider approved successfully');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => adminApi.rejectRider(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['riders'] });
      alert('Rider rejected');
    },
  });

  const suspendMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => adminApi.suspendRider(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['riders'] });
      alert('Rider suspended');
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: number) => adminApi.activateRider(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['riders'] });
      alert('Rider activated');
    },
  });

  const handleAction = (action: string, riderId: number) => {
    if (action === 'approve') {
      approveMutation.mutate(riderId);
    } else if (action === 'reject') {
      const reason = prompt('Enter rejection reason:');
      if (reason) rejectMutation.mutate({ id: riderId, reason });
    } else if (action === 'suspend') {
      const reason = prompt('Enter suspension reason:');
      if (reason) suspendMutation.mutate({ id: riderId, reason });
    } else if (action === 'activate') {
      activateMutation.mutate(riderId);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-brand-400/10 text-brand-300 border border-brand-400/20',
      ACTIVE: 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20',
      SUSPENDED: 'bg-red-400/10 text-red-300 border border-red-400/20',
      REJECTED: 'bg-ink-700 text-zinc-400',
    };
    return styles[status as keyof typeof styles] || 'bg-ink-700 text-zinc-400';
  };

  const th = 'px-6 py-3.5 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider';

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white tracking-tight mb-8">Rider Management</h1>

      <div className="bg-ink-900 border border-ink-700 rounded-2xl mb-6 p-4">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, phone, vehicle…"
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
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-zinc-500">Loading riders…</div>
      ) : (
        <div className="bg-ink-900 border border-ink-700 rounded-2xl overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-ink-850">
              <tr>
                <th className={th}>Rider</th>
                <th className={th}>Vehicle</th>
                <th className={th}>Status</th>
                <th className={th}>Rating</th>
                <th className={th}>Rides</th>
                <th className={th}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {riders?.data?.map((rider: any) => (
                <tr key={rider.id} className="hover:bg-ink-850 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-zinc-100">{rider.user?.fullName}</div>
                    <div className="text-sm text-zinc-500">{rider.user?.mobileNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-zinc-200">{rider.vehicleType} - {rider.vehicleModel}</div>
                    <div className="text-sm text-zinc-500">{rider.vehicleRegistrationNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 inline-flex text-[11px] leading-5 font-semibold rounded-full ${getStatusBadge(rider.approvalStatus)}`}>
                      {rider.approvalStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-300 font-medium">
                    ★ {rider.averageRating?.toFixed(1) || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                    {rider.totalRides || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-3">
                      {rider.approvalStatus === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleAction('approve', rider.id)}
                            className="text-emerald-400 hover:text-emerald-300"
                            title="Approve"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleAction('reject', rider.id)}
                            className="text-red-400 hover:text-red-300"
                            title="Reject"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      {rider.approvalStatus === 'ACTIVE' && (
                        <button
                          onClick={() => handleAction('suspend', rider.id)}
                          className="text-orange-400 hover:text-orange-300"
                          title="Suspend"
                        >
                          <Ban className="w-5 h-5" />
                        </button>
                      )}
                      {rider.approvalStatus === 'SUSPENDED' && (
                        <button
                          onClick={() => handleAction('activate', rider.id)}
                          className="text-sky-400 hover:text-sky-300"
                          title="Activate"
                        >
                          <PlayCircle className="w-5 h-5" />
                        </button>
                      )}
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
