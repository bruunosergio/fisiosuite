import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Building2, Users, UserRound, CheckCircle2 } from 'lucide-react';
import { fetchPlatformClinics, fetchPlatformOverview } from '../../lib/queries';
import { Badge, Button, Card, EmptyState, ErrorBanner, Spinner } from '../../components/ui';
import { formatDateTime } from '../../lib/format';
import { getApiErrorMessage } from '../../lib/api';

export default function PlatformOverviewPage() {
  const overviewQuery = useQuery({ queryKey: ['platform', 'overview'], queryFn: fetchPlatformOverview });
  const clinicsQuery = useQuery({ queryKey: ['platform', 'clinics'], queryFn: fetchPlatformClinics });

  const overview = overviewQuery.data;
  const recent = (clinicsQuery.data ?? []).slice(0, 5);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Visão geral</h1>
          <p className="mt-1 text-sm text-slate-400">Acompanhe clínicas cadastradas na plataforma</p>
        </div>
        <Link to="/platform/clinics">
          <Button variant="secondary">Ver todas as clínicas</Button>
        </Link>
      </div>

      {(overviewQuery.isError || clinicsQuery.isError) && (
        <div className="mb-4">
          <ErrorBanner
            message={getApiErrorMessage(
              overviewQuery.error ?? clinicsQuery.error,
              'Não foi possível carregar os dados da plataforma.',
            )}
          />
        </div>
      )}

      {overviewQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Building2} label="Clínicas" value={overview?.clinicCount ?? 0} />
            <StatCard icon={CheckCircle2} label="Clínicas ativas" value={overview?.activeClinicCount ?? 0} />
            <StatCard icon={Users} label="Usuários" value={overview?.userCount ?? 0} />
            <StatCard icon={UserRound} label="Pacientes" value={overview?.patientCount ?? 0} />
          </div>

          <h2 className="mb-3 text-sm font-semibold text-slate-200">Cadastros recentes</h2>
          <Card padded={false} className="border-slate-800 bg-slate-900">
            {clinicsQuery.isLoading ? (
              <div className="flex justify-center p-8">
                <Spinner />
              </div>
            ) : recent.length === 0 ? (
              <div className="p-6">
                <EmptyState title="Nenhuma clínica cadastrada" description="Novos cadastros via /register aparecerão aqui." />
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-medium">Clínica</th>
                    <th className="px-5 py-3 font-medium">Admin</th>
                    <th className="px-5 py-3 font-medium">Usuários</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Criada em</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {recent.map((clinic) => (
                    <tr key={clinic.id} className="hover:bg-slate-800/50">
                      <td className="px-5 py-3.5">
                        <Link to={`/platform/clinics/${clinic.id}`} className="font-medium text-white hover:text-brand-300">
                          {clinic.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-slate-400">{clinic.adminEmail ?? '—'}</td>
                      <td className="px-5 py-3.5 text-slate-400">{clinic.userCount}</td>
                      <td className="px-5 py-3.5">
                        <Badge tone={clinic.active ? 'emerald' : 'slate'}>
                          {clinic.active ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-slate-400">{formatDateTime(clinic.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: number;
}) {
  return (
    <Card className="border-slate-800 bg-slate-900">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600/20 text-brand-400">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="text-2xl font-semibold text-white">{value}</p>
        </div>
      </div>
    </Card>
  );
}
