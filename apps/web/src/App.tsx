import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { usePlatformAuth } from './lib/platform-auth';
import Layout from './pages/Layout';
import LoginPage from './pages/LoginPage';
import RegisterClinicPage from './pages/RegisterClinicPage';
import DashboardPage from './pages/DashboardPage';
import AgendaPage from './pages/AgendaPage';
import PatientsPage from './pages/PatientsPage';
import PackagesPage from './pages/PackagesPage';
import ClinicalPage from './pages/ClinicalPage';
import FinancePage from './pages/FinancePage';
import TeamPage from './pages/TeamPage';
import PlatformLoginPage from './pages/platform/PlatformLoginPage';
import PlatformLayout from './pages/platform/PlatformLayout';
import PlatformOverviewPage from './pages/platform/PlatformOverviewPage';
import PlatformClinicsPage from './pages/platform/PlatformClinicsPage';
import PlatformClinicDetailPage from './pages/platform/PlatformClinicDetailPage';
import { Spinner } from './components/ui';

function ProtectedLayout() {
  const { token, initializing } = useAuth();

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Spinner />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Layout />;
}

function PublicOnlyRoute({ children }: { children: ReactElement }) {
  const { token, initializing } = useAuth();

  if (initializing) return null;
  if (token) return <Navigate to="/" replace />;
  return children;
}

function PlatformProtectedLayout() {
  const { token, initializing } = usePlatformAuth();

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <Spinner />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/platform/login" replace />;
  }

  return <PlatformLayout />;
}

function PlatformPublicOnlyRoute({ children }: { children: ReactElement }) {
  const { token, initializing } = usePlatformAuth();

  if (initializing) return null;
  if (token) return <Navigate to="/platform" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <RegisterClinicPage />
          </PublicOnlyRoute>
        }
      />

      <Route
        path="/platform/login"
        element={
          <PlatformPublicOnlyRoute>
            <PlatformLoginPage />
          </PlatformPublicOnlyRoute>
        }
      />

      <Route path="/platform" element={<PlatformProtectedLayout />}>
        <Route index element={<PlatformOverviewPage />} />
        <Route path="clinics" element={<PlatformClinicsPage />} />
        <Route path="clinics/:id" element={<PlatformClinicDetailPage />} />
      </Route>

      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/agenda" element={<AgendaPage />} />
        <Route path="/pacientes" element={<PatientsPage />} />
        <Route path="/equipe" element={<TeamPage />} />
        <Route path="/pacotes" element={<PackagesPage />} />
        <Route path="/prontuario" element={<ClinicalPage />} />
        <Route path="/financeiro" element={<FinancePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
