import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Search } from 'lucide-react';
import { createPatient, fetchPatients, updatePatient } from '../lib/queries';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  Textarea,
} from '../components/ui';
import { formatDate, toDateInputValue } from '../lib/format';
import { getApiErrorMessage } from '../lib/api';
import type { Patient } from '../lib/types';

type StatusFilter = 'all' | 'active' | 'inactive';

export default function PatientsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);

  const patientsQuery = useQuery({ queryKey: ['patients'], queryFn: fetchPatients });

  const filteredPatients = useMemo(() => {
    let list = patientsQuery.data ?? [];
    if (statusFilter === 'active') list = list.filter((p) => p.active);
    if (statusFilter === 'inactive') list = list.filter((p) => !p.active);
    if (!search.trim()) return list;
    const term = search.trim().toLowerCase();
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.email ?? '').toLowerCase().includes(term) ||
        (p.phone ?? '').includes(term) ||
        (p.whatsapp ?? '').includes(term) ||
        (p.cpf ?? '').includes(term),
    );
  }, [patientsQuery.data, search, statusFilter]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['patients'] });
  }

  return (
    <div>
      <PageHeader
        title="Pacientes"
        description="Cadastro, edição e status dos pacientes da clínica"
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo paciente
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, telefone, e-mail ou CPF"
            className="pl-9"
          />
        </div>
        <div className="w-full sm:w-44">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
            <option value="all">Todos</option>
            <option value="active">Somente ativos</option>
            <option value="inactive">Somente inativos</option>
          </Select>
        </div>
      </div>

      <Card padded={false}>
        {patientsQuery.isLoading ? (
          <div className="flex justify-center p-10">
            <Spinner />
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="p-6">
            <EmptyState title="Nenhum paciente encontrado" description="Cadastre o primeiro paciente da clínica." />
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">Nome</th>
                <th className="px-5 py-3 font-medium">Contato</th>
                <th className="px-5 py-3 font-medium">Nascimento</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPatients.map((patient) => (
                <tr
                  key={patient.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => setEditing(patient)}
                >
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-slate-800">{patient.name}</p>
                    {patient.cpf && <p className="text-xs text-slate-400">CPF: {patient.cpf}</p>}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    <p>{patient.phone ?? patient.whatsapp ?? '—'}</p>
                    <p className="text-xs text-slate-400">{patient.email ?? ''}</p>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{formatDate(patient.birthDate)}</td>
                  <td className="px-5 py-3.5">
                    <Badge tone={patient.active ? 'emerald' : 'slate'}>
                      {patient.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(patient);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {isCreateOpen && (
        <PatientFormModal
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            invalidate();
          }}
        />
      )}

      {editing && (
        <PatientFormModal
          mode="edit"
          patient={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            invalidate();
          }}
        />
      )}
    </div>
  );
}

type PatientFormState = {
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  cpf: string;
  birthDate: string;
  notes: string;
  active: boolean;
};

function patientToForm(patient?: Patient): PatientFormState {
  return {
    name: patient?.name ?? '',
    phone: patient?.phone ?? '',
    whatsapp: patient?.whatsapp ?? '',
    email: patient?.email ?? '',
    cpf: patient?.cpf ?? '',
    birthDate: patient?.birthDate ? toDateInputValue(new Date(patient.birthDate)) : '',
    notes: patient?.notes ?? '',
    active: patient?.active ?? true,
  };
}

function PatientFormModal({
  mode,
  patient,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit';
  patient?: Patient;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<PatientFormState>(() => patientToForm(patient));
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: createPatient,
    onSuccess: onSaved,
    onError: (err) => setError(getApiErrorMessage(err, 'Não foi possível cadastrar o paciente.')),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updatePatient>[1]) => updatePatient(patient!.id, payload),
    onSuccess: onSaved,
    onError: (err) => setError(getApiErrorMessage(err, 'Não foi possível salvar as alterações.')),
  });

  const loading = createMutation.isPending || updateMutation.isPending;

  function updateField<K extends keyof PatientFormState>(key: K, value: PatientFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    setError(null);
    if (!form.name.trim()) {
      setError('Informe o nome do paciente.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      phone: form.phone || null,
      whatsapp: form.whatsapp || null,
      email: form.email || null,
      cpf: form.cpf || null,
      birthDate: form.birthDate || null,
      notes: form.notes || null,
    };

    if (mode === 'create') {
      createMutation.mutate({
        name: payload.name,
        phone: payload.phone ?? undefined,
        whatsapp: payload.whatsapp ?? undefined,
        email: payload.email ?? undefined,
        cpf: payload.cpf ?? undefined,
        birthDate: payload.birthDate ?? undefined,
        notes: payload.notes ?? undefined,
      });
      return;
    }

    updateMutation.mutate({
      ...payload,
      active: form.active,
    });
  }

  return (
    <Modal title={mode === 'create' ? 'Novo paciente' : 'Editar paciente'} onClose={onClose}>
      <div className="space-y-4">
        {error && <ErrorBanner message={error} />}

        <Field label="Nome completo">
          <Input
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="Nome do paciente"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Telefone">
            <Input
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </Field>
          <Field label="WhatsApp">
            <Input
              value={form.whatsapp}
              onChange={(e) => updateField('whatsapp', e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="E-mail">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="paciente@email.com"
            />
          </Field>
          <Field label="CPF">
            <Input
              value={form.cpf}
              onChange={(e) => updateField('cpf', e.target.value)}
              placeholder="000.000.000-00"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Data de nascimento">
            <Input
              type="date"
              value={form.birthDate}
              onChange={(e) => updateField('birthDate', e.target.value)}
            />
          </Field>
          {mode === 'edit' && (
            <Field label="Status" hint="Inativo esconde o paciente das agendas novas, sem apagar o histórico.">
              <Select
                value={form.active ? 'active' : 'inactive'}
                onChange={(e) => updateField('active', e.target.value === 'active')}
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </Select>
            </Field>
          )}
        </div>

        <Field label="Observações">
          <Textarea
            rows={3}
            value={form.notes}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Alergias, preferências, observações gerais"
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            {mode === 'create' ? 'Cadastrar paciente' : 'Salvar alterações'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
