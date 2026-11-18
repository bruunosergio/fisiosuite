import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  createPackagePlan,
  deactivatePackagePlan,
  fetchPackagePlans,
  fetchPatientPackages,
  fetchPatients,
  fetchRenewalAlerts,
  sellPackage,
  updatePackagePlan,
} from '../lib/queries';
import {
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
import { PackageStatusBadge } from '../components/StatusBadge';
import { brlInputToCents, formatCentsToBRL, formatDate, toDateInputValue } from '../lib/format';
import { getApiErrorMessage } from '../lib/api';
import type { PackagePlan, PaymentMethod, PaymentMode } from '../lib/types';

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Dinheiro',
  PIX: 'Pix',
  CARD: 'Cartão',
  BOLETO: 'Boleto',
  OTHER: 'Outro',
};

function centsToBrlInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

export default function PackagesPage() {
  const queryClient = useQueryClient();
  const [isPlanModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PackagePlan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<PackagePlan | null>(null);
  const [isSellModalOpen, setSellModalOpen] = useState(false);

  const plansQuery = useQuery({ queryKey: ['packages', 'plans'], queryFn: fetchPackagePlans });
  const patientsQuery = useQuery({ queryKey: ['patients'], queryFn: fetchPatients });
  const patientPackagesQuery = useQuery({
    queryKey: ['packages', 'patient-packages'],
    queryFn: () => fetchPatientPackages(),
  });
  const renewalQuery = useQuery({ queryKey: ['packages', 'renewal-alerts'], queryFn: fetchRenewalAlerts });

  const patientsById = useMemo(() => new Map((patientsQuery.data ?? []).map((p) => [p.id, p.name])), [patientsQuery.data]);
  const plansById = useMemo(() => new Map((plansQuery.data ?? []).map((p) => [p.id, p.name])), [plansQuery.data]);

  function invalidatePackages() {
    queryClient.invalidateQueries({ queryKey: ['packages'] });
    queryClient.invalidateQueries({ queryKey: ['finance'] });
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deactivatePackagePlan(id),
    onSuccess: () => {
      setDeletingPlan(null);
      invalidatePackages();
    },
  });

  return (
    <div>
      <PageHeader
        title="Pacotes"
        description="Planos de sessões, vendas e alertas de renovação"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setPlanModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Novo plano
            </Button>
            <Button onClick={() => setSellModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Vender pacote
            </Button>
          </div>
        }
      />

      {(renewalQuery.data ?? []).length > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-sm font-semibold">Alertas de renovação</p>
          </div>
          <div className="mt-3 space-y-2">
            {(renewalQuery.data ?? []).map((pkg) => (
              <div key={pkg.id} className="flex items-center justify-between rounded-lg bg-white px-4 py-2.5 text-sm">
                <div>
                  <p className="font-medium text-slate-800">{patientsById.get(pkg.patientId) ?? 'Paciente'}</p>
                  <p className="text-xs text-slate-400">
                    {plansById.get(pkg.planId) ?? 'Plano'} · {Math.max(0, pkg.totalSessions - pkg.usedSessions)} sessões
                    restantes
                    {pkg.expiresAt ? ` · expira em ${formatDate(pkg.expiresAt)}` : ''}
                  </p>
                </div>
                <PackageStatusBadge status={pkg.status} />
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Planos disponíveis</h2>
        {plansQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (plansQuery.data ?? []).length === 0 ? (
          <EmptyState title="Nenhum plano cadastrado" description="Crie o primeiro plano de sessões da clínica." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(plansQuery.data ?? []).map((plan) => (
              <Card key={plan.id}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-800">{plan.name}</p>
                    <p className="text-xs text-slate-400">{plan.sessionCount} sessões</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="secondary" onClick={() => setEditingPlan(plan)}>
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeletingPlan(plan)}>
                      <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                    </Button>
                  </div>
                </div>
                <p className="mt-4 text-xl font-semibold text-slate-900">{formatCentsToBRL(plan.priceCents)}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {plan.validityDays ? `Validade de ${plan.validityDays} dias` : 'Sem validade definida'}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Pacotes dos pacientes</h2>
        <Card padded={false}>
          {patientPackagesQuery.isLoading ? (
            <div className="flex justify-center p-8">
              <Spinner />
            </div>
          ) : (patientPackagesQuery.data ?? []).length === 0 ? (
            <div className="p-6">
              <EmptyState title="Nenhum pacote vendido ainda" />
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-medium">Paciente</th>
                  <th className="px-5 py-3 font-medium">Plano</th>
                  <th className="px-5 py-3 font-medium">Sessões</th>
                  <th className="px-5 py-3 font-medium">Validade</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(patientPackagesQuery.data ?? []).map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-medium text-slate-800">{patientsById.get(pkg.patientId) ?? 'Paciente'}</td>
                    <td className="px-5 py-3.5 text-slate-600">{plansById.get(pkg.planId) ?? 'Plano'}</td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {pkg.usedSessions}/{pkg.totalSessions}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{formatDate(pkg.expiresAt)}</td>
                    <td className="px-5 py-3.5">
                      <PackageStatusBadge status={pkg.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {isPlanModalOpen && (
        <PlanFormModal
          mode="create"
          onClose={() => setPlanModalOpen(false)}
          onSaved={() => {
            setPlanModalOpen(false);
            invalidatePackages();
          }}
        />
      )}

      {editingPlan && (
        <PlanFormModal
          mode="edit"
          plan={editingPlan}
          onClose={() => setEditingPlan(null)}
          onSaved={() => {
            setEditingPlan(null);
            invalidatePackages();
          }}
        />
      )}

      {deletingPlan && (
        <Modal title="Excluir plano" onClose={() => setDeletingPlan(null)}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              O plano <span className="font-medium text-slate-800">{deletingPlan.name}</span> será desativado e
              deixará de aparecer para novas vendas. Pacotes já vendidos permanecem no histórico.
            </p>
            {deleteMutation.isError && (
              <ErrorBanner message={getApiErrorMessage(deleteMutation.error, 'Não foi possível excluir o plano.')} />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeletingPlan(null)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                loading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deletingPlan.id)}
              >
                Excluir plano
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {isSellModalOpen && (
        <SellPackageModal
          patients={patientsQuery.data ?? []}
          plans={plansQuery.data ?? []}
          onClose={() => setSellModalOpen(false)}
          onSold={() => {
            setSellModalOpen(false);
            invalidatePackages();
          }}
        />
      )}
    </div>
  );
}

function PlanFormModal({
  mode,
  plan,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit';
  plan?: PackagePlan;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(plan?.name ?? '');
  const [sessionCount, setSessionCount] = useState(plan?.sessionCount ?? 10);
  const [price, setPrice] = useState(plan ? centsToBrlInput(plan.priceCents) : '');
  const [validityDays, setValidityDays] = useState(plan?.validityDays ? String(plan.validityDays) : '');
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: createPackagePlan,
    onSuccess: onSaved,
    onError: (err) => setError(getApiErrorMessage(err, 'Não foi possível criar o plano.')),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updatePackagePlan>[1]) => updatePackagePlan(plan!.id, payload),
    onSuccess: onSaved,
    onError: (err) => setError(getApiErrorMessage(err, 'Não foi possível salvar o plano.')),
  });

  const loading = createMutation.isPending || updateMutation.isPending;

  function handleSubmit() {
    setError(null);
    if (!name.trim() || sessionCount <= 0) {
      setError('Informe nome e quantidade de sessões válidos.');
      return;
    }
    const payload = {
      name: name.trim(),
      sessionCount,
      priceCents: brlInputToCents(price),
      validityDays: validityDays ? Number(validityDays) : null,
    };
    if (mode === 'create') {
      createMutation.mutate({
        ...payload,
        validityDays: payload.validityDays ?? undefined,
      });
      return;
    }
    updateMutation.mutate(payload);
  }

  return (
    <Modal title={mode === 'create' ? 'Novo plano de sessões' : 'Editar plano'} onClose={onClose}>
      <div className="space-y-4">
        {error && <ErrorBanner message={error} />}

        <Field label="Nome do plano">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Pacote 10 sessões" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Quantidade de sessões">
            <Input type="number" min={1} value={sessionCount} onChange={(e) => setSessionCount(Number(e.target.value))} />
          </Field>
          <Field label="Preço (R$)">
            <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="990,00" />
          </Field>
        </div>

        <Field label="Validade em dias (opcional)">
          <Input type="number" min={1} value={validityDays} onChange={(e) => setValidityDays(e.target.value)} placeholder="90" />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            {mode === 'create' ? 'Criar plano' : 'Salvar alterações'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function SellPackageModal({
  patients,
  plans,
  onClose,
  onSold,
}: {
  patients: { id: string; name: string }[];
  plans: { id: string; name: string; priceCents: number }[];
  onClose: () => void;
  onSold: () => void;
}) {
  const [patientId, setPatientId] = useState('');
  const [planId, setPlanId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('PAID_NOW');
  const [installments, setInstallments] = useState('3');
  const [firstDueDate, setFirstDueDate] = useState(toDateInputValue(new Date()));
  const [error, setError] = useState<string | null>(null);

  const sellMutation = useMutation({
    mutationFn: sellPackage,
    onSuccess: onSold,
    onError: (err) => setError(getApiErrorMessage(err, 'Não foi possível vender o pacote.')),
  });

  function handleSubmit() {
    setError(null);
    if (!patientId || !planId) {
      setError('Selecione o paciente e o plano.');
      return;
    }
    const installmentsN = Number(installments);
    if (paymentMode === 'INSTALLMENTS' && (installmentsN < 2 || installmentsN > 24)) {
      setError('Informe entre 2 e 24 parcelas.');
      return;
    }
    sellMutation.mutate({
      patientId,
      planId,
      paymentMethod,
      paymentMode,
      installments: paymentMode === 'INSTALLMENTS' ? installmentsN : undefined,
      firstDueDate:
        paymentMode === 'ON_ACCOUNT' || paymentMode === 'INSTALLMENTS' ? firstDueDate : undefined,
    });
  }

  return (
    <Modal title="Vender pacote" onClose={onClose}>
      <div className="space-y-4">
        {error && <ErrorBanner message={error} />}

        <Field label="Paciente">
          <Select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
            <option value="">Selecione um paciente</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Plano">
          <Select value={planId} onChange={(e) => setPlanId(e.target.value)}>
            <option value="">Selecione um plano</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {formatCentsToBRL(p.priceCents)}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Condição de pagamento"
          hint="Se não for à vista, o sistema cria conta(s) a receber no Financeiro."
        >
          <Select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}>
            <option value="PAID_NOW">Pago agora (Pix/cartão/dinheiro)</option>
            <option value="ON_ACCOUNT">A receber depois (gera dívida)</option>
            <option value="INSTALLMENTS">Parcelado (várias dívidas)</option>
          </Select>
        </Field>

        <Field label="Forma de pagamento">
          <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
            {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>

        {(paymentMode === 'ON_ACCOUNT' || paymentMode === 'INSTALLMENTS') && (
          <Field label={paymentMode === 'INSTALLMENTS' ? '1º vencimento' : 'Vencimento'}>
            <Input type="date" value={firstDueDate} onChange={(e) => setFirstDueDate(e.target.value)} />
          </Field>
        )}

        {paymentMode === 'INSTALLMENTS' && (
          <Field label="Número de parcelas">
            <Input
              type="number"
              min={2}
              max={24}
              value={installments}
              onChange={(e) => setInstallments(e.target.value)}
            />
          </Field>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={sellMutation.isPending}>
            Confirmar venda
          </Button>
        </div>
      </div>
    </Modal>
  );
}
