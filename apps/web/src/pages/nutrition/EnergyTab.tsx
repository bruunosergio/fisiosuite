import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Input, Select, Spinner, Textarea } from '../../components/ui';
import { createEnergyCalculation, fetchAnthropometry, fetchEnergyCalculations } from '../../lib/queries';
import { getApiErrorMessage } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import type { BiologicalSex, EnergyCalculation, EnergyFormula, Patient } from '../../lib/types';
import { fmt, parseNum } from './utils';

export const FORMULA_LABELS: Record<EnergyFormula, string> = {
  MIFFLIN: 'Mifflin-St Jeor',
  HARRIS_BENEDICT: 'Harris-Benedict',
  FAO_WHO: 'FAO/OMS',
  CUSTOM: 'TMB personalizada',
};

const ACTIVITY_PRESETS = [
  { value: '1.2', label: 'Sedentário (1,2)' },
  { value: '1.375', label: 'Levemente ativo (1,375)' },
  { value: '1.55', label: 'Moderadamente ativo (1,55)' },
  { value: '1.725', label: 'Muito ativo (1,725)' },
  { value: '1.9', label: 'Extremamente ativo (1,9)' },
  { value: 'custom', label: 'Outro valor' },
];

function ResultCard({ calc }: { calc: EnergyCalculation }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">TMB</p>
          <p className="text-xl font-semibold text-slate-900">{fmt(calc.bmrKcal, 0)}</p>
          <p className="text-xs text-slate-400">kcal</p>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">GET</p>
          <p className="text-xl font-semibold text-slate-900">{fmt(calc.tdeeKcal, 0)}</p>
          <p className="text-xs text-slate-400">kcal</p>
        </div>
        <div className="rounded-lg bg-brand-50 p-3">
          <p className="text-xs text-brand-700">Meta</p>
          <p className="text-xl font-semibold text-brand-800">{fmt(calc.targetKcal, 0)}</p>
          <p className="text-xs text-brand-600">kcal</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center text-sm">
        <div>
          <p className="font-semibold text-slate-800">{fmt(calc.macros.carbsG, 0)} g</p>
          <p className="text-xs text-slate-500">Carboidratos ({fmt(calc.carbPct, 0)}%)</p>
        </div>
        <div>
          <p className="font-semibold text-slate-800">{fmt(calc.macros.proteinG, 0)} g</p>
          <p className="text-xs text-slate-500">Proteínas ({fmt(calc.proteinPct, 0)}%)</p>
        </div>
        <div>
          <p className="font-semibold text-slate-800">{fmt(calc.macros.fatG, 0)} g</p>
          <p className="text-xs text-slate-500">Gorduras ({fmt(calc.fatPct, 0)}%)</p>
        </div>
      </div>
    </div>
  );
}

export default function EnergyTab({ patient }: { patient: Patient }) {
  const queryClient = useQueryClient();
  const [formula, setFormula] = useState<EnergyFormula>('MIFFLIN');
  const [activityPreset, setActivityPreset] = useState('1.375');
  const [activityCustom, setActivityCustom] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [sex, setSex] = useState<BiologicalSex | ''>(patient.biologicalSex ?? '');
  const [customBmr, setCustomBmr] = useState('');
  const [adjustment, setAdjustment] = useState('0');
  const [targetOverride, setTargetOverride] = useState('');
  const [carbPct, setCarbPct] = useState('50');
  const [proteinPct, setProteinPct] = useState('20');
  const [fatPct, setFatPct] = useState('30');
  const [proteinGPerKg, setProteinGPerKg] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<EnergyCalculation | null>(null);

  const historyQuery = useQuery({
    queryKey: ['nutrition', 'energy', patient.id],
    queryFn: () => fetchEnergyCalculations(patient.id),
  });
  const assessmentsQuery = useQuery({
    queryKey: ['nutrition', 'anthropometry', patient.id],
    queryFn: () => fetchAnthropometry(patient.id),
  });
  const latestAssessment = assessmentsQuery.data?.[0];

  const mutation = useMutation({
    mutationFn: createEnergyCalculation,
    onSuccess: (calc) => {
      setError(null);
      setLastResult(calc);
      queryClient.invalidateQueries({ queryKey: ['nutrition', 'energy', patient.id] });
    },
    onError: (err) => setError(getApiErrorMessage(err, 'Não foi possível calcular o gasto energético.')),
  });

  const macroSum = (parseNum(carbPct) ?? 0) + (parseNum(proteinPct) ?? 0) + (parseNum(fatPct) ?? 0);
  const macroOk = Math.abs(macroSum - 100) <= 0.5;
  const needsSex = formula === 'MIFFLIN' || formula === 'HARRIS_BENEDICT';

  function calculate() {
    setError(null);
    const activityFactor = parseNum(activityPreset === 'custom' ? activityCustom : activityPreset);
    if (!activityFactor || activityFactor < 1 || activityFactor > 3) {
      setError('Informe um fator de atividade entre 1 e 3.');
      return;
    }
    if (!macroOk) {
      setError('Os percentuais de macronutrientes devem somar 100%.');
      return;
    }
    if (formula === 'CUSTOM' && !parseNum(customBmr)) {
      setError('Informe a TMB personalizada.');
      return;
    }
    if (needsSex && sex !== 'MALE' && sex !== 'FEMALE') {
      setError('Selecione o sexo biológico (masculino ou feminino).');
      return;
    }
    mutation.mutate({
      patientId: patient.id,
      assessmentId: !weight && !height ? latestAssessment?.id : undefined,
      formula,
      activityFactor,
      weightKg: parseNum(weight),
      heightCm: parseNum(height),
      sex: sex || undefined,
      customBmrKcal: formula === 'CUSTOM' ? parseNum(customBmr) : undefined,
      targetKcal: parseNum(targetOverride),
      kcalAdjustment: parseNum(adjustment),
      carbPct: parseNum(carbPct) ?? 0,
      proteinPct: parseNum(proteinPct) ?? 0,
      fatPct: parseNum(fatPct) ?? 0,
      proteinGPerKg: parseNum(proteinGPerKg),
      notes: notes.trim() || undefined,
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Cálculo de gasto energético</h2>
        {error && (
          <div className="mb-3">
            <ErrorBanner message={error} />
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Fórmula">
            <Select value={formula} onChange={(e) => setFormula(e.target.value as EnergyFormula)}>
              {(Object.keys(FORMULA_LABELS) as EnergyFormula[]).map((f) => (
                <option key={f} value={f}>
                  {FORMULA_LABELS[f]}
                </option>
              ))}
            </Select>
          </Field>
          {formula === 'CUSTOM' ? (
            <Field label="TMB personalizada (kcal)">
              <Input inputMode="decimal" value={customBmr} onChange={(e) => setCustomBmr(e.target.value)} />
            </Field>
          ) : (
            <Field label="Sexo biológico">
              <Select value={sex} onChange={(e) => setSex(e.target.value as BiologicalSex | '')}>
                <option value="">Selecione</option>
                <option value="FEMALE">Feminino</option>
                <option value="MALE">Masculino</option>
              </Select>
            </Field>
          )}
          <Field label="Nível de atividade">
            <Select value={activityPreset} onChange={(e) => setActivityPreset(e.target.value)}>
              {ACTIVITY_PRESETS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </Select>
          </Field>
          {activityPreset === 'custom' && (
            <Field label="Fator de atividade">
              <Input inputMode="decimal" value={activityCustom} onChange={(e) => setActivityCustom(e.target.value)} />
            </Field>
          )}
          <Field
            label="Peso (kg)"
            hint={latestAssessment ? `Em branco = última avaliação (${fmt(latestAssessment.weightKg)} kg)` : undefined}
          >
            <Input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
          </Field>
          <Field
            label="Altura (cm)"
            hint={latestAssessment ? `Em branco = última avaliação (${fmt(latestAssessment.heightCm)} cm)` : undefined}
          >
            <Input inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} />
          </Field>
          <Field label="Ajuste calórico (kcal)" hint="Ex.: -500 para déficit, +300 para superávit">
            <Input inputMode="decimal" value={adjustment} onChange={(e) => setAdjustment(e.target.value)} />
          </Field>
          <Field label="Meta kcal (opcional)" hint="Sobrepõe GET + ajuste">
            <Input inputMode="decimal" value={targetOverride} onChange={(e) => setTargetOverride(e.target.value)} />
          </Field>
        </div>

        <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">Macronutrientes (%)</p>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Carboidratos">
            <Input inputMode="decimal" value={carbPct} onChange={(e) => setCarbPct(e.target.value)} />
          </Field>
          <Field label="Proteínas">
            <Input inputMode="decimal" value={proteinPct} onChange={(e) => setProteinPct(e.target.value)} />
          </Field>
          <Field label="Gorduras">
            <Input inputMode="decimal" value={fatPct} onChange={(e) => setFatPct(e.target.value)} />
          </Field>
          <Field label="Proteína (g/kg)">
            <Input inputMode="decimal" value={proteinGPerKg} onChange={(e) => setProteinGPerKg(e.target.value)} />
          </Field>
        </div>
        <p className={macroOk ? 'mt-2 text-xs text-emerald-600' : 'mt-2 text-xs text-rose-600'}>
          Soma: {fmt(macroSum, 1)}% {macroOk ? '' : '(deve ser 100%)'}
        </p>

        <div className="mt-3">
          <Field label="Observações">
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={calculate} loading={mutation.isPending}>
            Calcular e salvar
          </Button>
        </div>
      </Card>

      <div className="space-y-4 lg:col-span-2">
        <Card>
          <h2 className="mb-3 text-base font-semibold text-slate-900">Resultado</h2>
          {lastResult ? (
            <>
              <p className="mb-3 text-xs text-slate-500">{FORMULA_LABELS[lastResult.formula]} · FA {fmt(lastResult.activityFactor, 3)}</p>
              <ResultCard calc={lastResult} />
            </>
          ) : (
            <EmptyState title="Faça um cálculo para ver TMB, GET e meta" />
          )}
        </Card>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Cálculos anteriores</h3>
          {historyQuery.isLoading ? (
            <Spinner />
          ) : !historyQuery.data?.length ? (
            <p className="text-sm text-slate-400">Nenhum cálculo salvo.</p>
          ) : (
            historyQuery.data.slice(0, 6).map((c) => (
              <Card key={c.id} className="!p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{formatDateTime(c.createdAt)}</span>
                  <Badge tone="teal">{FORMULA_LABELS[c.formula]}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-700">
                  TMB {fmt(c.bmrKcal, 0)} · GET {fmt(c.tdeeKcal, 0)} ·{' '}
                  <span className="font-semibold text-brand-700">Meta {fmt(c.targetKcal, 0)} kcal</span>
                </p>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
