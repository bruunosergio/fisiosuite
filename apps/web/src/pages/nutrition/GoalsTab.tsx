import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Input, Select, Spinner } from '../../components/ui';
import { createGoal, fetchGoals } from '../../lib/queries';
import { getApiErrorMessage } from '../../lib/api';
import { formatDate } from '../../lib/format';
import type { GoalStatus, Patient } from '../../lib/types';

const METRICS = [
  'Peso (kg)',
  '% de gordura',
  'Circunferência da cintura (cm)',
  'IMC',
  'Massa magra (kg)',
  'Hábito alimentar',
  'Hidratação (L/dia)',
  'Outro',
];

const STATUS_LABEL: Record<string, string> = { OPEN: 'Em andamento', ACHIEVED: 'Atingida', CANCELLED: 'Cancelada' };
const STATUS_TONE: Record<string, 'sky' | 'emerald' | 'slate'> = { OPEN: 'sky', ACHIEVED: 'emerald', CANCELLED: 'slate' };

export default function GoalsTab({ patient }: { patient: Patient }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [metricType, setMetricType] = useState(METRICS[0]);
  const [targetValue, setTargetValue] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<GoalStatus>('OPEN');
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({ queryKey: ['nutrition', 'goals', patient.id], queryFn: () => fetchGoals(patient.id) });

  const mutation = useMutation({
    mutationFn: createGoal,
    onSuccess: () => {
      setTitle('');
      setTargetValue('');
      setCurrentValue('');
      setDueDate('');
      setStatus('OPEN');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['nutrition', 'goals', patient.id] });
    },
    onError: (err) => setError(getApiErrorMessage(err, 'Não foi possível salvar a meta.')),
  });

  function save() {
    setError(null);
    if (!title.trim()) {
      setError('Informe o título da meta.');
      return;
    }
    mutation.mutate({
      patientId: patient.id,
      title: title.trim(),
      metricType,
      targetValue: targetValue.trim() || undefined,
      currentValue: currentValue.trim() || undefined,
      dueDate: dueDate ? new Date(`${dueDate}T12:00:00`).toISOString() : undefined,
      status,
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-2">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Nova meta</h2>
        {error && (
          <div className="mb-3">
            <ErrorBanner message={error} />
          </div>
        )}
        <div className="space-y-3">
          <Field label="Título">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Reduzir 5 kg em 3 meses" />
          </Field>
          <Field label="Métrica">
            <Select value={metricType} onChange={(e) => setMetricType(e.target.value)}>
              {METRICS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor atual">
              <Input value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} />
            </Field>
            <Field label="Valor alvo">
              <Input value={targetValue} onChange={(e) => setTargetValue(e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prazo">
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </Field>
            <Field label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value as GoalStatus)}>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={save} loading={mutation.isPending}>
            Salvar meta
          </Button>
        </div>
      </Card>

      <div className="space-y-3 lg:col-span-3">
        <h2 className="text-base font-semibold text-slate-900">Metas do paciente</h2>
        {query.isLoading ? (
          <Spinner />
        ) : !query.data?.length ? (
          <EmptyState title="Nenhuma meta cadastrada" />
        ) : (
          query.data.map((g) => (
            <Card key={g.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{g.title}</p>
                  <p className="text-xs text-slate-500">{g.metricType}</p>
                </div>
                <Badge tone={STATUS_TONE[g.status] ?? 'slate'}>{STATUS_LABEL[g.status] ?? g.status}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-700">
                <span>Atual: {g.currentValue ?? '—'}</span>
                <span>Alvo: {g.targetValue ?? '—'}</span>
                <span>Prazo: {formatDate(g.dueDate)}</span>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
