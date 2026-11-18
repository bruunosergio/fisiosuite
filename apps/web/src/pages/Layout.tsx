import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Package,
  Stethoscope,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../lib/auth';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays, end: false },
  { to: '/pacientes', label: 'Pacientes', icon: Users, end: false },
  { to: '/equipe', label: 'Equipe', icon: UserCog, end: false },
  { to: '/pacotes', label: 'Pacotes', icon: Package, end: false },
  { to: '/prontuario', label: 'Prontuário', icon: Stethoscope, end: false },
  { to: '/financeiro', label: 'Financeiro', icon: Wallet, end: false },
];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  RECEPTION: 'Recepção',
  PROFESSIONAL: 'Profissional',
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 px-6 py-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            FS
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">FisioSuite</p>
            <p className="text-xs text-slate-400">Gestão de clínicas</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <div className="mb-2 rounded-lg bg-slate-50 px-3 py-2.5">
            <p className="truncate text-sm font-medium text-slate-800">{user?.name}</p>
            <p className="text-xs text-slate-400">{user ? ROLE_LABELS[user.role] ?? user.role : ''}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
