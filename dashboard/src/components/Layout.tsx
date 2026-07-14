import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Bike,
  Activity,
  MessageSquare,
  Settings,
  LogOut,
  CheckCircle,
} from 'lucide-react';

const Layout = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/riders/verification', icon: CheckCircle, label: 'Rider Verification' },
    { path: '/monitoring', icon: Activity, label: 'Live Monitoring' },
    { path: '/users', icon: Users, label: 'Riders' },
    { path: '/bookings', icon: Bike, label: 'Bookings' },
    { path: '/complaints', icon: MessageSquare, label: 'Complaints' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const active = menuItems.find((m) => location.pathname.startsWith(m.path));

  return (
    <div className="flex h-screen bg-ink-950 text-zinc-200">
      <aside className="w-64 flex-shrink-0 flex flex-col bg-ink-900 border-r border-ink-700">
        <div className="px-6 py-6 border-b border-ink-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-400 flex items-center justify-center shadow-glow">
              <Bike size={22} className="text-black" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-none">
                FLUX
              </h1>
              <p className="text-[11px] text-zinc-500 mt-1 uppercase tracking-widest">
                Admin Console
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `group flex items-center px-3.5 py-2.5 rounded-xl text-sm transition-all ${
                  isActive
                    ? 'bg-brand-400 text-black font-semibold shadow-glow'
                    : 'text-zinc-400 hover:text-white hover:bg-ink-800'
                }`
              }
            >
              <item.icon size={18} className="mr-3 flex-shrink-0" strokeWidth={2.2} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-ink-700">
          <div className="flex items-center gap-3 px-2 py-2 mb-2 rounded-xl bg-ink-850">
            <div className="w-8 h-8 rounded-full bg-ink-700 flex items-center justify-center text-xs font-bold text-brand-300">
              AD
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-200 truncate">Administrator</p>
              <p className="text-[10px] text-zinc-500 truncate">Signed in</p>
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('adminToken');
              window.location.href = '/login';
            }}
            className="flex items-center px-3.5 py-2.5 w-full text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors text-sm"
          >
            <LogOut size={18} className="mr-3" strokeWidth={2.2} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-ink-950">
        <header className="sticky top-0 z-20 flex items-center justify-between px-6 h-16 border-b border-ink-700 bg-ink-950/80 backdrop-blur-xl">
          <h2 className="text-sm font-semibold text-zinc-300">
            {active?.label || 'Dashboard'}
          </h2>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
