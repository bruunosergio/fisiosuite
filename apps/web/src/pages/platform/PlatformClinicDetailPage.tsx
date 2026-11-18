import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { fetchPlatformClinic, updatePlatformClinic } from '../../lib/queries';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  Select,
  Spinner,
} from '../../components/ui';
import { formatDateTime } from '../../lib/format';
import { getApiErrorMessage } from '../../lib/api';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  RECEPTION: 'Recepção',
  PROFESSIONAL: 'Fisioterapeuta',
};

export default function PlatformClinicDetailPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const clinicQuery = useQuery({
    queryKey: ['platform', 'clinics', id],
    queryFn: () => fetchPlatformClinic(id),
    enabled: Boolean(id),
  });

  const clinic = clinicQuery.data;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [document, setDocument] = useState('');
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!clinic) return;
    setName(clinic.name);
    setPhone(clinic.phone ?? '');
    setDocument(clinic.document ?? '');
    setActive(clinic.active);
    setSaved(false);
    setError(null);
  }, [clinic]);

  const saveMutation = useMutation({
    mutationFn: () =>
      updatePlatformClinic(id, {
        name: name.trim(),
        phone: phone || null,
        document: document || null,
        active,
      }),
    onSuccess: () => {
      setSaved(true);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['platform'] });
    },
    onError: (err) => {
      setSaved(false);
      setError(getApiErrorMessage(err, 'Não foi possível salvar as alterações.'));
    },
  });

  return (
    <div>
      <div className="mb-4">
        <Link to="/platform/clinics" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" />
          Voltar para clínicas
        </Link>
      </div>

      {clinicQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : clinicQuery.isError || !clinic ? (
        <ErrorBanner message={getApiErrorMessage(clinicQuery.error, 'Clínica não encontrada.')} />
      ) : (
        <>
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-white">{clinic.name}</h1>
            <p className="mt-1 text-sm text-slate-400">
              Admin: {clinic.adminEmail ?? '—'} · Criada em {formatDateTime(clinic.createdAt)}
            </p>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <Metric label="Usuários" value={clinic.userCount} />
            <Metric label="Pacientes" value={clinic.patientCount} />
            <Metric label="Agendamentos" value={clinic.appointmentCount} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-slate-800 bg-slate-900">
              <h2 className="mb-4 text-sm font-semibold text-slate-200">Dados da clínica</h2>
              {error && (
                <div className="mb-3">
                  <ErrorBanner message={error} />
                </div>
              )}
              {saved && (
                <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                  Alterações salvas.
                </div>
              )}
              <div className="space-y-3">
                <Field label="Nome">
                  <Input
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setSaved(false);
                    }}
                    className="border-slate-700 bg-slate-950 text-white"
                  />
                </Field>
                <Field label="Telefone">
                  <Input
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setSaved(false);
                    }}
                    className="border-slate-700 bg-slate-950 text-white"
                  />
                </Field>
                <Field label="CNPJ / documento">
                  <Input
                    value={document}
                    onChange={(e) => {
                      setDocument(e.target.value);
                      setSaved(false);
                    }}
                    className="border-slate-700 bg-slate-950 text-white"
                  />
                </Field>
                <Field label="Status" hint="Inativa mantém os dados, mas a clínica fica marcada como desligada.">
                  <Select
                    value={active ? 'active' : 'inactive'}
                    onChange={(e) => {
                      setActive(e.target.value === 'active');
                      setSaved(false);
                    }}
                    className="border-slate-700 bg-slate-950 text-white"
                  >
                    <option value="active">Ativa</option>
                    <option value="inactive">Inativa</option>
                  </Select>
                </Field>
                <div className="flex justify-end pt-2">
                  <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
                    Salvar alterações
                  </Button>
                </div>
              </div>
            </Card>

            <Card padded={false} className="border-slate-800 bg-slate-900">
              <div className="border-b border-slate-800 px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-200">Usuários da clínica</h2>
              </div>
              {clinic.users.length === 0 ? (
                <div className="p-6">
                  <EmptyState title="Nenhum usuário" />
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3 font-medium">Nome</th>
                      <th className="px-5 py-3 font-medium">Papel</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {clinic.users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-white">{user.name}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </td>
                        <td className="px-5 py-3.5 text-slate-400">{ROLE_LABELS[user.role] ?? user.role}</td>
                        <td className="px-5 py-3.5">
                          <Badge tone={user.active ? 'emerald' : 'slate'}>
                            {user.active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="border-slate-800 bg-slate-900">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    </Card>
  );
}
