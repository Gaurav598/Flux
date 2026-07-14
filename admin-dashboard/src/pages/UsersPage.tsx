import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../lib/api';
import { Search, Mail, Phone, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', searchQuery],
    queryFn: () => adminApi.getUsers({ search: searchQuery }),
  });

  const th = 'px-6 py-3.5 text-left text-[11px] font-medium text-zinc-500 uppercase tracking-wider';

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white tracking-tight mb-8">User Management</h1>

      <div className="bg-ink-900 border border-ink-700 rounded-2xl mb-6 p-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name or mobile number…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-ink-850 border border-ink-700 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400 outline-none"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-zinc-500">Loading users…</div>
      ) : (
        <div className="bg-ink-900 border border-ink-700 rounded-2xl overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-ink-850">
              <tr>
                <th className={th}>User</th>
                <th className={th}>Contact</th>
                <th className={th}>Role</th>
                <th className={th}>Total Rides</th>
                <th className={th}>Status</th>
                <th className={th}>Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {users?.data?.map((user: any) => (
                <tr key={user.id} className="hover:bg-ink-850 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-brand-400 flex items-center justify-center text-black font-bold">
                          {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-zinc-100">{user.fullName}</div>
                        <div className="text-sm text-zinc-500">ID: {user.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-zinc-200 mb-1">
                      <Phone className="w-4 h-4 mr-2 text-zinc-500" />
                      {user.mobileNumber}
                    </div>
                    {user.email && (
                      <div className="flex items-center text-sm text-zinc-500">
                        <Mail className="w-4 h-4 mr-2 text-zinc-500" />
                        {user.email}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2.5 inline-flex text-[11px] leading-5 font-semibold rounded-full ${
                        user.role === 'ADMIN'
                          ? 'bg-violet-400/10 text-violet-300 border border-violet-400/20'
                          : 'bg-sky-400/10 text-sky-300 border border-sky-400/20'
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                    {user.totalRides || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2.5 inline-flex text-[11px] leading-5 font-semibold rounded-full ${
                        user.accountStatus === 'ACTIVE'
                          ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20'
                          : 'bg-red-400/10 text-red-300 border border-red-400/20'
                      }`}
                    >
                      {user.accountStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-zinc-300">
                      <Calendar className="w-4 h-4 mr-2 text-zinc-500" />
                      {user.createdAt ? format(new Date(user.createdAt), 'MMM dd, yyyy') : 'N/A'}
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
