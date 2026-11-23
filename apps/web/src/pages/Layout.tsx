import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Apple,
  CalendarDays,
  ClipboardPlus,
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

type Mode = 'clinic' | 'nutri' | 'plantao';

const CLINIC_NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays, end: false },
  { to: '/pacientes', label: 'Pacientes', icon: Users, end: false },
  { to: '/equipe', label: 'Equipe', icon: UserCog, end: false },
  { to: '/pacotes', label: 'Pacotes', icon: Package, end: false },
  { to: '/prontuario', label: 'Prontuário', icon: Stethoscope, end: false },
  { to: '/financeiro', label: 'Financeiro', icon: Wallet, end: false },
];

const NUTRI_NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays, end: false },
  { to: '/pacientes', label: 'Pacientes', icon: Users, end: false },
  { to: '/equipe', label: 'Equipe', icon: UserCog, end: false },
  { to: '/pacotes', label: 'Pacotes', icon: Package, end: false },
  { to: '/nutricao', label: 'Nutrição', icon: Apple, end: false },
  { to: '/financeiro', label: 'Financeiro', icon: Wallet, end: false },
];

const PLANTAO_NAV = [
  { to: '/plantao', label: 'Plantão', icon: ClipboardPlus, end: false },
  { to: '/pacientes', label: 'Pacientes', icon: Users, end: false },
  { to: '/equipe', label: 'Equipe', icon: UserCog, end: false },
];

const NAV_BY_MODE: Record<Mode, typeof CLINIC_NAV> = {
  clinic: CLINIC_NAV,
  nutri: NUTRI_NAV,
  plantao: PLANTAO_NAV,
};

const MODE_SUBTITLE: Record<Mode, string> = {
  clinic: 'Gestão de clínicas',
  nutri: 'Gestão de nutrição',
  plantao: 'Modo plantão',
};

const MODE_HOME: Record<Mode, string> = {
  clinic: '/',
  nutri: '/nutricao',
  plantao: '/plantao',
};

const MODE_LABEL: Record<Mode, string> = {
  clinic: 'Clínica',
  nutri: 'Nutrição',
  plantao: 'Plantão',
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  RECEPTION: 'Recepção',
  PROFESSIONAL: 'Profissional',
};

function modeFromPath(pathname: string): Mode | null {
  if (pathname.startsWith('/plantao')) return 'plantao';
  if (pathname.startsWith('/nutricao')) return 'nutri';
  if (pathname.startsWith('/prontuario')) return 'clinic';
  return null;
}

export default function Layout() {
  const { user, logout, enabledModules } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const hasFisio = enabledModules.includes('FISIOTERAPIA');
  const hasNutri = enabledModules.includes('NUTRICAO');
  const nutriOnly = hasNutri && !hasFisio;

  const availableModes = useMemo<Mode[]>(() => {
    if (nutriOnly) return ['nutri'];
    const modes: Mode[] = ['clinic'];
    if (hasNutri) modes.push('nutri');
    if (hasFisio) modes.push('plantao');
    return modes;
  }, [nutriOnly, hasNutri, hasFisio]);

  const [lastMode, setLastMode] = useState<Mode>(() => modeFromPath(location.pathname) ?? availableModes[0]);

  useEffect(() => {
    const fromPath = modeFromPath(location.pathname);
    if (fromPath && availableModes.includes(fromPath)) setLastMode(fromPath);
  }, [location.pathname, availableModes]);

  const mode: Mode = nutriOnly ? 'nutri' : availableModes.includes(lastMode) ? lastMode : availableModes[0];
  const navItems = NAV_BY_MODE[mode];
  const showToggle = availableModes.length > 1;

  function selectMode(next: Mode) {
    setLastMode(next);
    navigate(MODE_HOME[next]);
  }

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
            <p className="text-xs text-slate-400">{MODE_SUBTITLE[mode]}</p>
          </div>
        </div>

        {showToggle && (
          <div
            className={clsx(
              'mx-3 mb-3 grid gap-1 rounded-lg bg-slate-100 p-1',
              availableModes.length === 3 ? 'grid-cols-3' : 'grid-cols-2',
            )}
          >
            {availableModes.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => selectMode(m)}
                className={clsx(
                  'rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                  mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>
        )}

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={`${mode}-${to}`}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
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
            <p className="text-xs text-slate-400">
              {user ? ROLE_LABELS[user.role] ?? user.role : ''}
              {user?.councilType && user.councilNumber
                ? ` · ${user.councilType} ${user.councilNumber}${user.councilState ? `/${user.councilState}` : ''}`
                : ''}
            </p>
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
