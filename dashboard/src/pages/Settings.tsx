import React, { useState } from 'react';
import { Save, Server, Bell, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

const Settings = () => {
  const [apiUrl, setApiUrl] = useState(
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // In production this would persist to a backend config
    setTimeout(() => {
      toast.success('Settings saved');
      setSaving(false);
    }, 800);
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-zinc-500 mt-1 text-sm">Dashboard configuration and preferences</p>
      </div>

      <div className="space-y-6">
        <div className="bg-ink-900 border border-ink-700 rounded-2xl p-6">
          <div className="flex items-center mb-4">
            <Server size={18} className="text-brand-400 mr-2" />
            <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">
              API Configuration
            </h2>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">Backend API URL</label>
            <input
              type="text"
              className="w-full bg-ink-850 border border-ink-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400 outline-none"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
            />
            <p className="text-xs text-zinc-600 mt-1.5">
              Current: {import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'}
            </p>
          </div>
        </div>

        <div className="bg-ink-900 border border-ink-700 rounded-2xl p-6">
          <div className="flex items-center mb-4">
            <Bell size={18} className="text-brand-400 mr-2" />
            <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">
              Notifications
            </h2>
          </div>
          <div className="space-y-3">
            {['New rider applications', 'New complaints', 'System alerts'].map((label) => (
              <label key={label} className="flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="mr-3 w-4 h-4 accent-brand-400" />
                <span className="text-sm text-zinc-300">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-ink-900 border border-ink-700 rounded-2xl p-6">
          <div className="flex items-center mb-4">
            <Shield size={18} className="text-brand-400 mr-2" />
            <h2 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">Security</h2>
          </div>
          <div className="bg-brand-400/10 border border-brand-400/20 rounded-xl p-4 text-sm text-zinc-300">
            <p className="font-semibold mb-1 text-brand-200">Admin Session</p>
            <p className="text-zinc-400">
              You are logged in as an admin. Session token is stored in localStorage and sent as a
              Bearer token on every request.
            </p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('adminToken');
              window.location.href = '/login';
            }}
            className="mt-4 px-4 py-2.5 bg-red-500/15 text-red-300 border border-red-500/30 rounded-xl text-sm hover:bg-red-500/25 transition"
          >
            Sign Out
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center px-5 py-2.5 bg-brand-400 text-black font-semibold rounded-xl hover:bg-brand-300 transition disabled:opacity-50 text-sm"
        >
          <Save size={16} className="mr-2" />
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default Settings;
