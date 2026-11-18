import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Plus } from 'lucide-react';
import {
  createPayment,
  fetchCommissionReport,
  fetchFinanceSummary,
  fetchPatientPackages,
  fetchPatients,
  fetchPayments,
  fetchUsers,
  settlePayment,
} from '../lib/queries';
import { Button, Card, EmptyState, ErrorBanner, Field, Input, Modal, PageHeader, Select, Spinner } from '../components/ui';
import { PaymentStatusBadge } from '../components/StatusBadge';
import { brlInputToCents, formatCentsToBRL, formatDate, toDateInputValue } from '../lib/format';
import { getApiErrorMessage } from '../lib/api';
import type { CommissionReport, Payment, PaymentMethod, PaymentStatus } from '../lib/types';

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Dinheiro',
  PIX: 'Pix',
  CARD: 'Cartão',
  BOLETO: 'Boleto',
  OTHER: 'Outro',
};

type Tab = 'receivable' | 'received' | 'commission';

function firstDayOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isOverdue(payment: Payment) {
  if (payment.status !== 'PENDING' && payment.status !== 'PARTIAL') return false;
  if (!payment.dueDate) return false;
  const due = new Date(payment.dueDate);
  due.setHours(23, 59, 59, 999);
  return due.getTime() < Date.now();
}

export default function FinancePage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('receivable');
  const [isPaymentModalOpen, setPaymentModalOpen] = useState(false);
  const [settleTarget, setSettleTarget] = useState<Payment | null>(null);
  const [commissionForm, setCommissionForm] = useState({
    professionalId: '',
    from: toDateInputValue(firstDayOfMonth(new Date())),
    to: toDateInputValue(new Date()),
  });
  const [commissionReport, setCommissionReport] = useState<CommissionReport | null>(null);
  const [commissionError, setCommissionError] = useState<string | null>(null);

  const summaryQuery = useQuery({ queryKey: ['finance', 'summary'], queryFn: fetchFinanceSummary });
  const paymentsQuery = useQuery({ queryKey: ['finance', 'payments'], queryFn: () => fetchPayments() });
  const patientsQuery = useQuery({ queryKey: ['patients'], queryFn: fetchPatients });
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: fetchUsers });

  const patientsById = useMemo(() => new Map((patientsQuery.data ?? []).map((p) => [p.id, p.name])), [patientsQuery.data]);
  const professionals = useMemo(
    () => (usersQuery.data ?? []).filter((u) => u.role === 'PROFESSIONAL'),
    [usersQuery.data],
  );

  const receivable = useMemo(
    () =>
      (paymentsQuery.data ?? []).filter((p) => p.status === 'PENDING' || p.status === 'PARTIAL'),
    [paymentsQuery.data],
  );
  const received = useMemo(
    () => (paymentsQuery.data ?? []).filter((p) => p.status === 'PAID'),
    [paymentsQuery.data],
  );

  const settleMutation = useMutation({
    mutationFn: settlePayment,
    onSuccess: () => {
      setSettleTarget(null);
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    },
  });

  const commissionMutation = useMutation({
    mutationFn: fetchCommissionReport,
    onSuccess: (data) => setCommissionReport(data),
    onError: (err) => setCommissionError(getApiErrorMessage(err, 'Não foi possível gerar o relatório.')),
  });

  function invalidateFinance() {
    queryClient.invalidateQueries({ queryKey: ['finance'] });
  }

  const summary = summaryQuery.data;

  return (
    <div>
      <PageHeader
        title="Financeiro"
        description="Contas a receber, baixas e comissões — a dívida nasce quando o paciente não paga à vista"
        action={
          <Button onClick={() => setPaymentModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Nova cobrança
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm font-medium text-slate-500">Recebido</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">
            {formatCentsToBRL(summary?.receivedCents ?? 0)}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-slate-500">A receber</p>
          <p className="mt-2 text-2xl font-semibold text-amber-600">
            {formatCentsToBRL(summary?.pendingCents ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-400">{summary?.pendingCount ?? 0} cobrança(s)</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-slate-500">Vencido</p>
          <p className="mt-2 text-2xl font-semibold text-rose-600">
            {formatCentsToBRL(summary?.overdueCents ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-400">{summary?.overdueCount ?? 0} em atraso</p>
        </Card>
      </div>

      <div className="mb-4 flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
        {(
          [
            { id: 'receivable' as const, label: 'A receber' },
            { id: 'received' as const, label: 'Recebidos' },
            { id: 'commission' as const, label: 'Comissões' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'receivable' && (
        <Card padded={false}>
          {paymentsQuery.isLoading ? (
            <div className="flex justify-center p-10">
              <Spinner />
            </div>
          ) : receivable.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Nenhuma conta a receber"
                description="Ao vender um pacote sem pagamento à vista, a dívida aparece aqui."
              />
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-medium">Paciente</th>
                  <th className="px-5 py-3 font-medium">Descrição</th>
                  <th className="px-5 py-3 font-medium">Vencimento</th>
                  <th className="px-5 py-3 font-medium">Valor</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receivable.map((payment) => {
                  const overdue = isOverdue(payment);
                  return (
                    <tr key={payment.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3.5 font-medium text-slate-800">
                        {patientsById.get(payment.patientId) ?? 'Paciente'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        <p>{payment.notes ?? 'Cobrança'}</p>
                        {payment.installmentTotal && payment.installmentTotal > 1 && (
                          <p className="text-xs text-slate-400">
                            Parcela {payment.installmentNumber}/{payment.installmentTotal}
                          </p>
                        )}
                      </td>
                      <td className={`px-5 py-3.5 ${overdue ? 'font-medium text-rose-600' : 'text-slate-600'}`}>
                        {formatDate(payment.dueDate)}
                        {overdue ? ' · vencido' : ''}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-800">
                        {formatCentsToBRL(payment.amountCents)}
                      </td>
                      <td className="px-5 py-3.5">
                        <PaymentStatusBadge status={payment.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setSettleTarget(payment)}
                          disabled={settleMutation.isPending}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Dar baixa
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {tab === 'received' && (
        <Card padded={false}>
          {paymentsQuery.isLoading ? (
            <div className="flex justify-center p-10">
              <Spinner />
            </div>
          ) : received.length === 0 ? (
            <div className="p-6">
              <EmptyState title="Nenhum recebimento registrado" />
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-3 font-medium">Paciente</th>
                  <th className="px-5 py-3 font-medium">Descrição</th>
                  <th className="px-5 py-3 font-medium">Método</th>
                  <th className="px-5 py-3 font-medium">Valor</th>
                  <th className="px-5 py-3 font-medium">Pago em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {received.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-medium text-slate-800">
                      {patientsById.get(payment.patientId) ?? 'Paciente'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{payment.notes ?? '—'}</td>
                    <td className="px-5 py-3.5 text-slate-600">{PAYMENT_METHOD_LABELS[payment.method]}</td>
                    <td className="px-5 py-3.5 font-medium text-emerald-700">
                      {formatCentsToBRL(payment.amountCents)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{formatDate(payment.paidAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {tab === 'commission' && (
        <Card>
          {commissionError && (
            <div className="mb-4">
              <ErrorBanner message={commissionError} />
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <Field label="Profissional">
                <Select
                  value={commissionForm.professionalId}
                  onChange={(e) => setCommissionForm((p) => ({ ...p, professionalId: e.target.value }))}
                >
                  <option value="">Selecione um profissional</option>
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="De">
              <Input
                type="date"
                value={commissionForm.from}
                onChange={(e) => setCommissionForm((p) => ({ ...p, from: e.target.value }))}
              />
            </Field>
            <Field label="Até">
              <Input
                type="date"
                value={commissionForm.to}
                onChange={(e) => setCommissionForm((p) => ({ ...p, to: e.target.value }))}
              />
            </Field>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              onClick={() => {
                setCommissionError(null);
                if (!commissionForm.professionalId) {
                  setCommissionError('Selecione um profissional.');
                  return;
                }
                commissionMutation.mutate(commissionForm);
              }}
              loading={commissionMutation.isPending}
            >
              Gerar relatório
            </Button>
          </div>

          {commissionReport && (
            <div className="mt-6 border-t border-slate-100 pt-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{commissionReport.professionalName}</p>
                  <p className="text-xs text-slate-400">Comissão: {commissionReport.commissionPct}%</p>
                </div>
                <p className="text-xl font-semibold text-brand-700">
                  {formatCentsToBRL(commissionReport.totalCommissionCents)}
                </p>
              </div>
              {commissionReport.lines.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhum atendimento no período.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                      <th className="py-2 font-medium">Data</th>
                      <th className="py-2 font-medium">Status</th>
                      <th className="py-2 font-medium">Sessão</th>
                      <th className="py-2 font-medium">Comissão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {commissionReport.lines.map((line) => (
                      <tr key={line.appointmentId}>
                        <td className="py-2 text-slate-600">{formatDate(line.startsAt)}</td>
                        <td className="py-2 text-slate-600">{line.status}</td>
                        <td className="py-2 text-slate-600">{formatCentsToBRL(line.sessionPriceCents)}</td>
                        <td className="py-2 font-medium text-slate-800">
                          {formatCentsToBRL(line.commissionCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </Card>
      )}

      {isPaymentModalOpen && (
        <CreateChargeModal
          onClose={() => setPaymentModalOpen(false)}
          onCreated={() => {
            setPaymentModalOpen(false);
            invalidateFinance();
          }}
        />
      )}

      {settleTarget && (
        <SettleModal
          payment={settleTarget}
          patientName={patientsById.get(settleTarget.patientId) ?? 'Paciente'}
          loading={settleMutation.isPending}
          error={
            settleMutation.isError
              ? getApiErrorMessage(settleMutation.error, 'Não foi possível dar baixa.')
              : null
          }
          onClose={() => setSettleTarget(null)}
          onConfirm={(method) =>
            settleMutation.mutate({ id: settleTarget.id, method })
          }
        />
      )}
    </div>
  );
}

function SettleModal({
  payment,
  patientName,
  loading,
  error,
  onClose,
  onConfirm,
}: {
  payment: Payment;
  patientName: string;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (method: PaymentMethod) => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>(payment.method);

  return (
    <Modal title="Dar baixa no recebimento" onClose={onClose}>
      <div className="space-y-4">
        {error && <ErrorBanner message={error} />}
        <p className="text-sm text-slate-600">
          Confirmar recebimento de <strong>{formatCentsToBRL(payment.amountCents)}</strong> de{' '}
          <strong>{patientName}</strong>
          {payment.installmentTotal && payment.installmentTotal > 1
            ? ` (parcela ${payment.installmentNumber}/${payment.installmentTotal})`
            : ''}
          .
        </p>
        <Field label="Forma de pagamento recebida">
          <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(method)} loading={loading}>
            Confirmar baixa
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function CreateChargeModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [patientId, setPatientId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('PIX');
  const [status, setStatus] = useState<PaymentStatus>('PENDING');
  const [dueDate, setDueDate] = useState(toDateInputValue(new Date()));
  const [notes, setNotes] = useState('');
  const [packageId, setPackageId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const patientsQuery = useQuery({ queryKey: ['patients'], queryFn: fetchPatients });
  const packagesQuery = useQuery({
    queryKey: ['patient-packages', patientId],
    queryFn: () => fetchPatientPackages(patientId),
    enabled: Boolean(patientId),
  });

  const createMutation = useMutation({
    mutationFn: createPayment,
    onSuccess: onCreated,
    onError: (err) => setError(getApiErrorMessage(err, 'Não foi possível registrar.')),
  });

  function handleSubmit() {
    setError(null);
    if (!patientId || !amount) {
      setError('Selecione o paciente e informe o valor.');
      return;
    }
    createMutation.mutate({
      patientId,
      packageId: packageId || undefined,
      amountCents: brlInputToCents(amount),
      method,
      status,
      dueDate: status === 'PENDING' ? dueDate : null,
      notes: notes || undefined,
    });
  }

  return (
    <Modal title="Nova cobrança" onClose={onClose}>
      <div className="space-y-4">
        {error && <ErrorBanner message={error} />}

        <Field label="Paciente">
          <Select
            value={patientId}
            onChange={(e) => {
              setPatientId(e.target.value);
              setPackageId('');
            }}
          >
            <option value="">Selecione um paciente</option>
            {(patientsQuery.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Pacote (opcional)">
          <Select value={packageId} onChange={(e) => setPackageId(e.target.value)} disabled={!patientId}>
            <option value="">Sem vínculo com pacote</option>
            {(packagesQuery.data ?? []).map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.id.slice(0, 8)} · {formatCentsToBRL(pkg.priceCents)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Valor (R$)">
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="150,00" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Forma">
            <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Situação">
            <Select value={status} onChange={(e) => setStatus(e.target.value as PaymentStatus)}>
              <option value="PENDING">A receber (dívida)</option>
              <option value="PAID">Já pago</option>
            </Select>
          </Field>
        </div>

        {status === 'PENDING' && (
          <Field label="Vencimento">
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
        )}

        <Field label="Observações">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: sessão avulsa, material…" />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={createMutation.isPending}>
            Salvar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
