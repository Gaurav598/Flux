import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Car, FileText, Bike } from 'lucide-react';

export default function Layout() {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/riders', label: 'Riders', icon: Car },
    { path: '/bookings', label: 'Bookings', icon: FileText },
    { path: '/users', label: 'Users', icon: Users },
  ];

  const active = navItems.find((i) => location.pathname === i.path);

  return (
    <div className="flex h-screen bg-ink-950 text-zinc-200">
      <aside className="w-64 flex-shrink-0 flex flex-col bg-ink-900 border-r border-ink-700">
        <div className="px-6 py-6 border-b border-ink-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-400 flex items-center justify-center shadow-glow">
              <Bike size={22} className="text-black" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-none">FLUX</h1>
              <p className="text-[11px] text-zinc-500 mt-1 uppercase tracking-widest">Admin</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-3.5 py-2.5 rounded-xl text-sm transition-all ${
                  isActive
                    ? 'bg-brand-400 text-black font-semibold shadow-glow'
                    : 'text-zinc-400 hover:text-white hover:bg-ink-800'
                }`}
              >
                <Icon className="w-[18px] h-[18px] mr-3" strokeWidth={2.2} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto bg-ink-950">
        <header className="sticky top-0 z-20 flex items-center justify-between px-8 h-16 border-b border-ink-700 bg-ink-950/80 backdrop-blur-xl">
          <h2 className="text-sm font-semibold text-zinc-300">{active?.label || 'Dashboard'}</h2>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
