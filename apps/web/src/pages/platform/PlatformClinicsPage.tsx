import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { fetchPlatformClinics } from '../../lib/queries';
import { Badge, Card, EmptyState, ErrorBanner, Input, PageHeader, Select, Spinner } from '../../components/ui';
import { formatDateTime } from '../../lib/format';
import { getApiErrorMessage } from '../../lib/api';

type StatusFilter = 'all' | 'active' | 'inactive';

export default function PlatformClinicsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const clinicsQuery = useQuery({ queryKey: ['platform', 'clinics'], queryFn: fetchPlatformClinics });

  const filtered = useMemo(() => {
    let list = clinicsQuery.data ?? [];
    if (statusFilter === 'active') list = list.filter((c) => c.active);
    if (statusFilter === 'inactive') list = list.filter((c) => !c.active);
    if (!search.trim()) return list;
    const term = search.trim().toLowerCase();
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.adminEmail ?? '').toLowerCase().includes(term) ||
        (c.phone ?? '').includes(term) ||
        (c.document ?? '').includes(term),
    );
  }, [clinicsQuery.data, search, statusFilter]);

  return (
    <div>
      <PageHeader title="Clínicas" description="Todas as clínicas cadastradas na plataforma" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, admin, telefone ou CNPJ"
            className="pl-9"
          />
        </div>
        <div className="w-full sm:w-44">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
            <option value="all">Todas</option>
            <option value="active">Somente ativas</option>
            <option value="inactive">Somente inativas</option>
          </Select>
        </div>
      </div>

      <Card padded={false}>
        {clinicsQuery.isLoading ? (
          <div className="flex justify-center p-10">
            <Spinner />
          </div>
        ) : clinicsQuery.isError ? (
          <div className="p-6">
            <ErrorBanner message={getApiErrorMessage(clinicsQuery.error, 'Não foi possível carregar as clínicas.')} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState title="Nenhuma clínica encontrada" />
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">Clínica</th>
                <th className="px-5 py-3 font-medium">Admin</th>
                <th className="px-5 py-3 font-medium">Usuários</th>
                <th className="px-5 py-3 font-medium">Pacientes</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Criada em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((clinic) => (
                <tr key={clinic.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3.5">
                    <Link
                      to={`/platform/clinics/${clinic.id}`}
                      className="font-medium text-slate-800 hover:text-brand-700"
                    >
                      {clinic.name}
                    </Link>
                    {clinic.phone && <p className="text-xs text-slate-400">{clinic.phone}</p>}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{clinic.adminEmail ?? '—'}</td>
                  <td className="px-5 py-3.5 text-slate-600">{clinic.userCount}</td>
                  <td className="px-5 py-3.5 text-slate-600">{clinic.patientCount}</td>
                  <td className="px-5 py-3.5">
                    <Badge tone={clinic.active ? 'emerald' : 'slate'}>
                      {clinic.active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{formatDateTime(clinic.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
