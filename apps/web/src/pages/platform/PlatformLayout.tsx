import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Building2, LayoutDashboard, LogOut } from 'lucide-react';
import clsx from 'clsx';
import { usePlatformAuth } from '../../lib/platform-auth';
import { Button } from '../../components/ui';

const NAV = [
  { to: '/platform', label: 'Visão geral', icon: LayoutDashboard, end: true },
  { to: '/platform/clinics', label: 'Clínicas', icon: Building2, end: false },
];

export default function PlatformLayout() {
  const { admin, logout } = usePlatformAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/platform/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
        <div className="px-6 py-6">
          <p className="text-sm font-semibold text-slate-900">FisioSuite Platform</p>
          <p className="text-xs text-slate-500">Admin da plataforma</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <p className="truncate text-sm font-medium text-slate-800">{admin?.name}</p>
          <p className="truncate text-xs text-slate-500">{admin?.email}</p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 w-full justify-start text-slate-600"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
