import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Input, Select, Spinner, Textarea } from '../../components/ui';
import { createAnthropometry, fetchAnthropometry } from '../../lib/queries';
import { getApiErrorMessage } from '../../lib/api';
import { formatDate, toDateInputValue } from '../../lib/format';
import type { AnthropometricAssessment, Patient } from '../../lib/types';
import { bmiCategory, fmt, parseNum } from './utils';

const CIRCUMFERENCES = [
  ['waist', 'Cintura'],
  ['hip', 'Quadril'],
  ['arm', 'Braço'],
  ['thigh', 'Coxa'],
  ['calf', 'Panturrilha'],
  ['neck', 'Pescoço'],
] as const;

const SKINFOLDS = [
  ['triceps', 'Tríceps'],
  ['subscapular', 'Subescapular'],
  ['suprailiac', 'Supra-ilíaca'],
  ['abdominal', 'Abdominal'],
  ['thigh', 'Coxa'],
  ['chest', 'Peitoral'],
] as const;

const PROTOCOLS = ['Pollock 3 dobras', 'Pollock 7 dobras', 'Petroski', 'Durnin & Womersley', 'Bioimpedância', 'Outro'];

type FormState = {
  measuredAt: string;
  weightKg: string;
  heightCm: string;
  bodyFatPct: string;
  bodyFatProtocol: string;
  leanMassKg: string;
  fatMassKg: string;
  notes: string;
  circ: Record<string, string>;
  skin: Record<string, string>;
};

const emptyForm = (): FormState => ({
  measuredAt: toDateInputValue(new Date()),
  weightKg: '',
  heightCm: '',
  bodyFatPct: '',
  bodyFatProtocol: '',
  leanMassKg: '',
  fatMassKg: '',
  notes: '',
  circ: {},
  skin: {},
});

function numericRecord(values: Record<string, string>): Record<string, number> | undefined {
  const entries = Object.entries(values)
    .map(([k, v]) => [k, parseNum(v)] as const)
    .filter((e): e is readonly [string, number] => e[1] !== undefined);
  return entries.length ? Object.fromEntries(entries) : undefined;
}

function WeightChart({ items }: { items: AnthropometricAssessment[] }) {
  const points = [...items].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  if (points.length < 2) return null;
  const w = 480;
  const h = 120;
  const pad = 16;
  const values = points.map((p) => p.weightKg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2);
    const y = h - pad - ((p.weightKg - min) / span) * (h - pad * 2);
    return { x, y, p };
  });
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-32 w-full">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-brand-600"
        points={coords.map((c) => `${c.x},${c.y}`).join(' ')}
      />
      {coords.map((c) => (
        <g key={c.p.id}>
          <circle cx={c.x} cy={c.y} r="3.5" className="fill-brand-600" />
          <text x={c.x} y={c.y - 8} textAnchor="middle" className="fill-slate-500" fontSize="10">
            {fmt(c.p.weightKg)}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function AnthropometryTab({ patient }: { patient: Patient }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['nutrition', 'anthropometry', patient.id],
    queryFn: () => fetchAnthropometry(patient.id),
  });

  const mutation = useMutation({
    mutationFn: createAnthropometry,
    onSuccess: () => {
      setForm(emptyForm());
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['nutrition', 'anthropometry', patient.id] });
    },
    onError: (err) => setError(getApiErrorMessage(err, 'Não foi possível salvar a avaliação.')),
  });

  const weight = parseNum(form.weightKg);
  const height = parseNum(form.heightCm);
  const bmi = useMemo(() => (weight && height ? weight / (height / 100) ** 2 : undefined), [weight, height]);

  function save() {
    setError(null);
    if (!weight || !height) {
      setError('Peso e altura são obrigatórios.');
      return;
    }
    mutation.mutate({
      patientId: patient.id,
      measuredAt: form.measuredAt ? new Date(`${form.measuredAt}T12:00:00`).toISOString() : undefined,
      weightKg: weight,
      heightCm: height,
      circumferences: numericRecord(form.circ),
      skinfolds: numericRecord(form.skin),
      bodyFatProtocol: form.bodyFatProtocol || undefined,
      bodyFatPct: parseNum(form.bodyFatPct),
      leanMassKg: parseNum(form.leanMassKg),
      fatMassKg: parseNum(form.fatMassKg),
      notes: form.notes.trim() || undefined,
    });
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((p) => ({ ...p, [key]: value }));

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-4 text-base font-semibold text-slate-900">Nova avaliação antropométrica</h2>
        {error && (
          <div className="mb-3">
            <ErrorBanner message={error} />
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Data">
            <Input type="date" value={form.measuredAt} onChange={(e) => set('measuredAt', e.target.value)} />
          </Field>
          <Field label="Peso (kg)">
            <Input inputMode="decimal" value={form.weightKg} onChange={(e) => set('weightKg', e.target.value)} />
          </Field>
          <Field label="Altura (cm)">
            <Input inputMode="decimal" value={form.heightCm} onChange={(e) => set('heightCm', e.target.value)} />
          </Field>
          <Field label="IMC (calculado)">
            <div className="flex h-[38px] items-center gap-2 text-sm text-slate-700">
              {bmi ? (
                <>
                  <span className="font-semibold">{fmt(bmi)}</span>
                  <Badge tone="teal">{bmiCategory(bmi)}</Badge>
                </>
              ) : (
                '—'
              )}
            </div>
          </Field>
        </div>

        <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">Circunferências (cm)</p>
        <div className="grid gap-3 sm:grid-cols-6">
          {CIRCUMFERENCES.map(([key, label]) => (
            <Field key={key} label={label}>
              <Input
                inputMode="decimal"
                value={form.circ[key] ?? ''}
                onChange={(e) => set('circ', { ...form.circ, [key]: e.target.value })}
              />
            </Field>
          ))}
        </div>

        <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">Dobras cutâneas (mm)</p>
        <div className="grid gap-3 sm:grid-cols-6">
          {SKINFOLDS.map(([key, label]) => (
            <Field key={key} label={label}>
              <Input
                inputMode="decimal"
                value={form.skin[key] ?? ''}
                onChange={(e) => set('skin', { ...form.skin, [key]: e.target.value })}
              />
            </Field>
          ))}
        </div>

        <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">Composição corporal</p>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Protocolo">
            <Select value={form.bodyFatProtocol} onChange={(e) => set('bodyFatProtocol', e.target.value)}>
              <option value="">Selecione</option>
              {PROTOCOLS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="% Gordura">
            <Input inputMode="decimal" value={form.bodyFatPct} onChange={(e) => set('bodyFatPct', e.target.value)} />
          </Field>
          <Field label="Massa magra (kg)">
            <Input inputMode="decimal" value={form.leanMassKg} onChange={(e) => set('leanMassKg', e.target.value)} />
          </Field>
          <Field label="Massa gorda (kg)">
            <Input inputMode="decimal" value={form.fatMassKg} onChange={(e) => set('fatMassKg', e.target.value)} />
          </Field>
        </div>

        <div className="mt-3">
          <Field label="Observações">
            <Textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </Field>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={save} loading={mutation.isPending}>
            Salvar avaliação
          </Button>
        </div>
      </Card>

      <Card padded={false}>
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Histórico</h2>
        </div>
        {query.isLoading ? (
          <div className="p-6">
            <Spinner />
          </div>
        ) : !query.data?.length ? (
          <div className="p-5">
            <EmptyState title="Nenhuma avaliação registrada" />
          </div>
        ) : (
          <>
            <div className="px-5 pt-4">
              <p className="text-xs font-medium text-slate-500">Evolução do peso (kg)</p>
              <WeightChart items={query.data} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-2.5">Data</th>
                    <th className="px-3 py-2.5">Peso</th>
                    <th className="px-3 py-2.5">Altura</th>
                    <th className="px-3 py-2.5">IMC</th>
                    <th className="px-3 py-2.5">% Gordura</th>
                    <th className="px-3 py-2.5">M. magra</th>
                    <th className="px-3 py-2.5">Cintura</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {query.data.map((a) => (
                    <tr key={a.id}>
                      <td className="px-5 py-2.5">{formatDate(a.measuredAt)}</td>
                      <td className="px-3 py-2.5">{fmt(a.weightKg)} kg</td>
                      <td className="px-3 py-2.5">{fmt(a.heightCm)} cm</td>
                      <td className="px-3 py-2.5">
                        {fmt(a.bmi)} <span className="text-xs text-slate-400">{bmiCategory(a.bmi)}</span>
                      </td>
                      <td className="px-3 py-2.5">{a.bodyFatPct != null ? `${fmt(a.bodyFatPct)}%` : '—'}</td>
                      <td className="px-3 py-2.5">{a.leanMassKg != null ? `${fmt(a.leanMassKg)} kg` : '—'}</td>
                      <td className="px-3 py-2.5">
                        {a.circumferences && typeof a.circumferences.waist === 'number'
                          ? `${fmt(a.circumferences.waist)} cm`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
