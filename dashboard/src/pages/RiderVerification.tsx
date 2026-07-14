import React, { useEffect, useState } from 'react';
import { Check, X, Eye, Download } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface Rider {
  id: number;
  user: {
    fullName: string;
    mobileNumber: string;
  };
  vehicleType: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleRegistrationNumber: string;
  drivingLicenseUrl: string;
  aadharCardUrl: string;
  panCardUrl: string;
  vehicleRcUrl: string;
  vehicleInsuranceUrl: string;
  vehiclePucUrl: string;
  vehiclePhotoUrl: string;
  selfieWithVehicleUrl: string;
  createdAt: string;
}

const RiderVerification = () => {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    fetchPendingRiders();
  }, []);

  const fetchPendingRiders = async () => {
    try {
      const response = await api.get('/admin/riders/pending');
      setRiders(response.data);
    } catch (error) {
      toast.error('Failed to fetch pending riders');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (riderId: number) => {
    try {
      await api.post(`/admin/riders/${riderId}/approve`);
      toast.success('Rider approved successfully');
      setRiders(riders.filter((r) => r.id !== riderId));
      setSelectedRider(null);
    } catch (error) {
      toast.error('Failed to approve rider');
    }
  };

  const handleReject = async () => {
    if (!selectedRider || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      await api.post(`/admin/riders/${selectedRider.id}/reject`, null, {
        params: { reason: rejectionReason },
      });
      toast.success('Rider rejected');
      setRiders(riders.filter((r) => r.id !== selectedRider.id));
      setSelectedRider(null);
      setShowRejectModal(false);
      setRejectionReason('');
    } catch (error) {
      toast.error('Failed to reject rider');
    }
  };

  const documents = [
    { key: 'drivingLicenseUrl', label: 'Driving License' },
    { key: 'aadharCardUrl', label: 'Aadhar Card' },
    { key: 'panCardUrl', label: 'PAN Card' },
    { key: 'vehicleRcUrl', label: 'Vehicle RC' },
    { key: 'vehicleInsuranceUrl', label: 'Vehicle Insurance' },
    { key: 'vehiclePucUrl', label: 'PUC Certificate' },
    { key: 'vehiclePhotoUrl', label: 'Vehicle Photo' },
    { key: 'selfieWithVehicleUrl', label: 'Selfie with Vehicle' },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh] text-zinc-500">Loading…</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Rider Verification</h1>
        <p className="text-zinc-500 mt-1 text-sm">{riders.length} applications pending review</p>
      </div>

      {riders.length === 0 ? (
        <div className="bg-ink-900 border border-ink-700 rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4 opacity-60">✅</div>
          <h2 className="text-lg font-semibold text-white mb-1">All caught up!</h2>
          <p className="text-zinc-500 text-sm">No pending rider applications at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-ink-900 border border-ink-700 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-ink-700 bg-ink-850">
                <h2 className="font-semibold text-zinc-200 text-sm">Pending Applications</h2>
              </div>
              <div className="divide-y divide-ink-700 max-h-[calc(100vh-280px)] overflow-y-auto">
                {riders.map((rider) => (
                  <div
                    key={rider.id}
                    className={`p-4 cursor-pointer transition border-l-2 ${
                      selectedRider?.id === rider.id
                        ? 'bg-brand-400/10 border-brand-400'
                        : 'hover:bg-ink-850 border-transparent'
                    }`}
                    onClick={() => setSelectedRider(rider)}
                  >
                    <h3 className="font-semibold text-zinc-100">{rider.user.fullName}</h3>
                    <p className="text-sm text-zinc-400">{rider.user.mobileNumber}</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {rider.vehicleMake} {rider.vehicleModel}
                    </p>
                    <p className="text-xs text-zinc-600 mt-1">
                      {new Date(rider.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedRider ? (
              <div className="bg-ink-900 border border-ink-700 rounded-2xl">
                <div className="p-6 border-b border-ink-700">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-white">{selectedRider.user.fullName}</h2>
                      <p className="text-zinc-400">{selectedRider.user.mobileNumber}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleApprove(selectedRider.id)}
                        className="flex items-center px-4 py-2.5 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-400 transition text-sm"
                      >
                        <Check size={18} className="mr-2" />
                        Approve
                      </button>
                      <button
                        onClick={() => setShowRejectModal(true)}
                        className="flex items-center px-4 py-2.5 bg-red-500/15 text-red-300 border border-red-500/30 font-semibold rounded-xl hover:bg-red-500/25 transition text-sm"
                      >
                        <X size={18} className="mr-2" />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-zinc-300 mb-3 uppercase tracking-wider">
                      Vehicle Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-zinc-500">Type</p>
                        <p className="font-medium text-zinc-100">{selectedRider.vehicleType}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">Make &amp; Model</p>
                        <p className="font-medium text-zinc-100">
                          {selectedRider.vehicleMake} {selectedRider.vehicleModel}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-500">Registration Number</p>
                        <p className="font-medium text-zinc-100">{selectedRider.vehicleRegistrationNumber}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-zinc-300 mb-3 uppercase tracking-wider">
                      Documents
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {documents.map((doc) => (
                        <div key={doc.key} className="border border-ink-700 bg-ink-850 rounded-xl p-4">
                          <p className="text-sm font-medium text-zinc-200 mb-2">{doc.label}</p>
                          {selectedRider[doc.key as keyof Rider] ? (
                            <div>
                              <img
                                src={selectedRider[doc.key as keyof Rider] as string}
                                alt={doc.label}
                                className="w-full h-32 object-cover rounded-lg mb-2 bg-ink-800"
                              />
                              <div className="flex space-x-2">
                                <a
                                  href={selectedRider[doc.key as keyof Rider] as string}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 flex items-center justify-center px-3 py-1.5 bg-brand-400 text-black font-semibold text-sm rounded-lg hover:bg-brand-300"
                                >
                                  <Eye size={14} className="mr-1" />
                                  View
                                </a>
                                <a
                                  href={selectedRider[doc.key as keyof Rider] as string}
                                  download
                                  className="flex-1 flex items-center justify-center px-3 py-1.5 bg-ink-700 text-zinc-200 text-sm rounded-lg hover:bg-ink-600"
                                >
                                  <Download size={14} className="mr-1" />
                                  Download
                                </a>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-red-400">Not uploaded</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-ink-900 border border-ink-700 rounded-2xl p-12 text-center">
                <div className="text-5xl mb-4 opacity-60">👈</div>
                <h2 className="text-lg font-semibold text-white mb-1">Select an application</h2>
                <p className="text-zinc-500 text-sm">
                  Choose a rider from the list to review their application.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-ink-900 border border-ink-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2">Reject Application</h2>
            <p className="text-zinc-400 mb-4 text-sm">
              Please provide a reason for rejecting this application:
            </p>
            <textarea
              className="w-full bg-ink-850 border border-ink-700 rounded-xl p-3 mb-4 h-32 text-sm text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400 outline-none resize-none"
              placeholder="Enter rejection reason…"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex space-x-3">
              <button
                onClick={handleReject}
                className="flex-1 bg-red-500 text-white font-semibold py-2.5 rounded-xl hover:bg-red-400 transition text-sm"
              >
                Reject
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                className="flex-1 bg-ink-700 text-zinc-200 py-2.5 rounded-xl hover:bg-ink-600 transition text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiderVerification;
