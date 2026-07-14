import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, MessageSquare } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface Complaint {
  id: number;
  complaintType: string;
  description: string;
  status: string;
  resolution?: string;
  createdAt: string;
  user?: { fullName: string; mobileNumber: string };
}

const Complaints = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [resolution, setResolution] = useState('');
  const [resolving, setResolving] = useState(false);

  const fetchComplaints = async () => {
    try {
      const res = await api.get('/complaints/open');
      setComplaints(res.data);
    } catch {
      toast.error('Failed to fetch complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleResolve = async () => {
    if (!selected || !resolution.trim()) {
      toast.error('Please enter a resolution');
      return;
    }
    setResolving(true);
    try {
      await api.post(`/complaints/${selected.id}/resolve`, null, { params: { resolution } });
      toast.success('Complaint resolved!');
      setComplaints(complaints.filter((c) => c.id !== selected.id));
      setSelected(null);
      setResolution('');
    } catch {
      toast.error('Failed to resolve complaint');
    } finally {
      setResolving(false);
    }
  };

  if (loading)
    return <div className="flex items-center justify-center h-[60vh] text-zinc-500">Loading…</div>;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Complaints</h1>
        <p className="text-zinc-500 mt-1 text-sm">
          {complaints.length} open complaint{complaints.length !== 1 ? 's' : ''}
        </p>
      </div>

      {complaints.length === 0 ? (
        <div className="bg-ink-900 border border-ink-700 rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4 opacity-60">😊</div>
          <h2 className="text-lg font-semibold text-white mb-1">No open complaints</h2>
          <p className="text-zinc-500 text-sm">All complaints have been resolved.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-ink-900 border border-ink-700 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-ink-700 bg-ink-850">
              <h2 className="font-semibold text-zinc-200 text-sm">Open Complaints</h2>
            </div>
            <div className="divide-y divide-ink-700 max-h-[calc(100vh-280px)] overflow-y-auto">
              {complaints.map((c) => (
                <div
                  key={c.id}
                  className={`p-4 cursor-pointer transition ${
                    selected?.id === c.id
                      ? 'bg-brand-400/10 border-l-2 border-brand-400'
                      : 'hover:bg-ink-850 border-l-2 border-transparent'
                  }`}
                  onClick={() => {
                    setSelected(c);
                    setResolution('');
                  }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold bg-red-400/10 text-red-300 border border-red-400/20 px-2 py-0.5 rounded">
                      {c.complaintType}
                    </span>
                    <span className="text-[11px] text-zinc-600">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-200 font-medium">{c.user?.fullName || 'Unknown User'}</p>
                  <p className="text-xs text-zinc-500 mt-1 truncate">{c.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            {selected ? (
              <div className="bg-ink-900 border border-ink-700 rounded-2xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">{selected.user?.fullName || 'Unknown User'}</h2>
                    <p className="text-zinc-500 text-sm">{selected.user?.mobileNumber}</p>
                  </div>
                  <span className="bg-red-400/10 text-red-300 border border-red-400/20 text-xs font-semibold px-3 py-1 rounded-full flex items-center">
                    <AlertCircle size={12} className="mr-1" /> {selected.complaintType}
                  </span>
                </div>

                <div className="bg-ink-850 border border-ink-700 rounded-xl p-4 mb-6">
                  <div className="flex items-center mb-2">
                    <MessageSquare size={15} className="text-zinc-500 mr-2" />
                    <span className="text-sm font-semibold text-zinc-300">Complaint Description</span>
                  </div>
                  <p className="text-zinc-300 text-sm leading-relaxed">{selected.description}</p>
                  <p className="text-zinc-600 text-xs mt-3">
                    Submitted: {new Date(selected.createdAt).toLocaleString()}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-2">Resolution</label>
                  <textarea
                    className="w-full bg-ink-850 border border-ink-700 rounded-xl p-3 text-sm text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400 outline-none resize-none"
                    rows={4}
                    placeholder="Enter your resolution or action taken…"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                  />
                  <button
                    onClick={handleResolve}
                    disabled={resolving}
                    className="mt-3 flex items-center px-5 py-2.5 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-400 transition disabled:opacity-50 text-sm"
                  >
                    <CheckCircle size={16} className="mr-2" />
                    {resolving ? 'Resolving…' : 'Mark as Resolved'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-ink-900 border border-ink-700 rounded-2xl p-12 text-center">
                <div className="text-5xl mb-4 opacity-60">👈</div>
                <h2 className="text-lg font-semibold text-white mb-1">Select a complaint</h2>
                <p className="text-zinc-500 text-sm">
                  Choose a complaint from the list to view details and resolve it.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Complaints;
