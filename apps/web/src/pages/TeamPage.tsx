import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Search } from 'lucide-react';
import { createUser, fetchUsers, updateUser } from '../lib/queries';
import type { Role, User } from '../lib/types';
import { getApiErrorMessage } from '../lib/api';
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
} from '../components/ui';

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador',
  RECEPTION: 'Recepção',
  PROFESSIONAL: 'Fisioterapeuta',
};

const ROLE_TONES: Record<Role, 'slate' | 'teal' | 'amber' | 'rose' | 'emerald'> = {
  ADMIN: 'amber',
  RECEPTION: 'slate',
  PROFESSIONAL: 'teal',
};

type StatusFilter = 'all' | 'active' | 'inactive';

export default function TeamPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const usersQuery = useQuery({ queryKey: ['users'], queryFn: fetchUsers });

  const filtered = useMemo(() => {
    let list = usersQuery.data ?? [];
    if (statusFilter === 'active') list = list.filter((u) => u.active);
    if (statusFilter === 'inactive') list = list.filter((u) => !u.active);
    if (!search.trim()) return list;
    const term = search.trim().toLowerCase();
    return list.filter(
      (u) =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        ROLE_LABELS[u.role].toLowerCase().includes(term),
    );
  }, [usersQuery.data, search, statusFilter]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  }

  return (
    <div>
      <PageHeader
        title="Equipe"
        description="Cadastre, edite e gerencie o status dos profissionais da clínica"
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo membro
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, e-mail ou papel"
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
        {usersQuery.isLoading ? (
          <div className="flex justify-center p-10">
            <Spinner />
          </div>
        ) : usersQuery.isError ? (
          <div className="p-6">
            <ErrorBanner message={getApiErrorMessage(usersQuery.error, 'Não foi possível carregar a equipe.')} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Nenhum membro encontrado"
              description="Cadastre o primeiro fisioterapeuta ou usuário da clínica."
            />
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">Nome</th>
                <th className="px-5 py-3 font-medium">E-mail</th>
                <th className="px-5 py-3 font-medium">Papel</th>
                <th className="px-5 py-3 font-medium">Comissão</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((user) => (
                <tr
                  key={user.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => setEditing(user)}
                >
                  <td className="px-5 py-3.5 font-medium text-slate-800">{user.name}</td>
                  <td className="px-5 py-3.5 text-slate-600">{user.email}</td>
                  <td className="px-5 py-3.5">
                    <Badge tone={ROLE_TONES[user.role]}>{ROLE_LABELS[user.role]}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {user.role === 'PROFESSIONAL'
                      ? user.commissionPct != null
                        ? `${user.commissionPct}%`
                        : '—'
                      : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge tone={user.active ? 'emerald' : 'slate'}>
                      {user.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(user);
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
        <MemberFormModal
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            invalidate();
          }}
        />
      )}

      {editing && (
        <MemberFormModal
          mode="edit"
          user={editing}
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

type FormState = {
  name: string;
  email: string;
  password: string;
  role: Role;
  commissionPct: string;
  active: boolean;
};

function userToForm(user?: User): FormState {
  return {
    name: user?.name ?? '',
    email: user?.email ?? '',
    password: '',
    role: user?.role ?? 'PROFESSIONAL',
    commissionPct: user?.commissionPct != null ? String(user.commissionPct) : '40',
    active: user?.active ?? true,
  };
}

function MemberFormModal({
  mode,
  user,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit';
  user?: User;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => userToForm(user));
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: onSaved,
    onError: (err) => setError(getApiErrorMessage(err, 'Não foi possível cadastrar o membro.')),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateUser>[1]) => updateUser(user!.id, payload),
    onSuccess: onSaved,
    onError: (err) => setError(getApiErrorMessage(err, 'Não foi possível salvar as alterações.')),
  });

  const loading = createMutation.isPending || updateMutation.isPending;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function parseCommission(): number | null | undefined {
    if (form.role !== 'PROFESSIONAL') return null;
    if (form.commissionPct.trim() === '') return null;
    const n = Number(form.commissionPct.replace(',', '.'));
    if (Number.isNaN(n) || n < 0 || n > 100) return undefined;
    return n;
  }

  function handleSubmit() {
    setError(null);
    if (!form.name.trim()) {
      setError('Informe o nome.');
      return;
    }
    if (!form.email.trim()) {
      setError('Informe o e-mail.');
      return;
    }

    const commissionPct = parseCommission();
    if (form.role === 'PROFESSIONAL' && commissionPct === undefined) {
      setError('Comissão deve ser um número entre 0 e 100.');
      return;
    }

    if (mode === 'create') {
      if (form.password.length < 8) {
        setError('A senha precisa ter pelo menos 8 caracteres.');
        return;
      }
      createMutation.mutate({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
        commissionPct,
      });
      return;
    }

    if (form.password && form.password.length < 8) {
      setError('A nova senha precisa ter pelo menos 8 caracteres.');
      return;
    }

    updateMutation.mutate({
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      role: form.role,
      commissionPct,
      active: form.active,
      ...(form.password ? { password: form.password } : {}),
    });
  }

  return (
    <Modal title={mode === 'create' ? 'Novo membro da equipe' : 'Editar membro'} onClose={onClose}>
      <div className="space-y-4">
        {error && <ErrorBanner message={error} />}

        <Field label="Nome completo">
          <Input
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Nome do profissional"
          />
        </Field>

        <Field label="E-mail (login)">
          <Input
            type="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="fisio@clinica.com"
          />
        </Field>

        <Field
          label={mode === 'create' ? 'Senha inicial' : 'Nova senha (opcional)'}
          hint={
            mode === 'create'
              ? 'Mínimo de 8 caracteres. O membro usará este e-mail e senha para entrar.'
              : 'Deixe em branco para manter a senha atual.'
          }
        >
          <Input
            type="password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Papel">
            <Select value={form.role} onChange={(e) => update('role', e.target.value as Role)}>
              <option value="PROFESSIONAL">Fisioterapeuta</option>
              <option value="RECEPTION">Recepção</option>
              <option value="ADMIN">Administrador</option>
            </Select>
          </Field>
          {mode === 'edit' && (
            <Field label="Status" hint="Inativo impede o login, sem apagar o histórico.">
              <Select
                value={form.active ? 'active' : 'inactive'}
                onChange={(e) => update('active', e.target.value === 'active')}
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </Select>
            </Field>
          )}
        </div>

        {form.role === 'PROFESSIONAL' && (
          <Field label="Comissão (%)" hint="Usada no cálculo de repasse no Financeiro.">
            <Input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={form.commissionPct}
              onChange={(e) => update('commissionPct', e.target.value)}
              placeholder="40"
            />
          </Field>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            {mode === 'create' ? 'Cadastrar' : 'Salvar alterações'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
