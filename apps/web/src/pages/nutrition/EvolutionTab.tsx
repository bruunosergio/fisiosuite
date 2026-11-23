import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Spinner, Textarea } from '../../components/ui';
import { createNutritionEvolution, fetchNutritionEvolutions } from '../../lib/queries';
import { getApiErrorMessage } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import type { Patient } from '../../lib/types';

const ADIME = [
  { key: 'assessment', letter: 'A', label: 'Avaliação nutricional', hint: 'Dados antropométricos, bioquímicos, clínicos e dietéticos' },
  { key: 'nutritionDiagnosis', letter: 'D', label: 'Diagnóstico nutricional', hint: 'Problema (P), etiologia (E) e sinais/sintomas (S)' },
  { key: 'intervention', letter: 'I', label: 'Intervenção', hint: 'Prescrição dietética, educação nutricional, aconselhamento' },
  { key: 'monitoringEvaluation', letter: 'ME', label: 'Monitoramento e avaliação', hint: 'Indicadores e metas para o retorno' },
] as const;

type Key = (typeof ADIME)[number]['key'];

export default function EvolutionTab({ patient }: { patient: Patient }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<Key, string>>({
    assessment: '',
    nutritionDiagnosis: '',
    intervention: '',
    monitoringEvaluation: '',
  });
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['nutrition', 'evolutions', patient.id],
    queryFn: () => fetchNutritionEvolutions(patient.id),
  });

  const mutation = useMutation({
    mutationFn: createNutritionEvolution,
    onSuccess: () => {
      setForm({ assessment: '', nutritionDiagnosis: '', intervention: '', monitoringEvaluation: '' });
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['nutrition', 'evolutions', patient.id] });
    },
    onError: (err) => setError(getApiErrorMessage(err, 'Não foi possível salvar a evolução.')),
  });

  function save() {
    setError(null);
    if (!Object.values(form).some((v) => v.trim())) {
      setError('Preencha ao menos um campo da evolução.');
      return;
    }
    mutation.mutate({
      patientId: patient.id,
      format: 'ADIME',
      assessment: form.assessment.trim() || undefined,
      nutritionDiagnosis: form.nutritionDiagnosis.trim() || undefined,
      intervention: form.intervention.trim() || undefined,
      monitoringEvaluation: form.monitoringEvaluation.trim() || undefined,
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Nova evolução (ADIME)</h2>
        {error && (
          <div className="mb-3">
            <ErrorBanner message={error} />
          </div>
        )}
        <div className="space-y-3">
          {ADIME.map((f) => (
            <Field key={f.key} label={`${f.letter} — ${f.label}`} hint={f.hint}>
              <Textarea rows={3} value={form[f.key]} onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))} />
            </Field>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={save} loading={mutation.isPending}>
            Salvar evolução
          </Button>
        </div>
      </Card>

      <div className="space-y-3 lg:col-span-2">
        <h2 className="text-base font-semibold text-slate-900">Evoluções anteriores</h2>
        {query.isLoading ? (
          <Spinner />
        ) : !query.data?.length ? (
          <EmptyState title="Nenhuma evolução registrada" />
        ) : (
          query.data.map((e) => (
            <Card key={e.id}>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-800">{formatDateTime(e.createdAt)}</span>
                <Badge tone="sky">{e.format}</Badge>
              </div>
              <dl className="space-y-2">
                {ADIME.map((f) =>
                  e[f.key] ? (
                    <div key={f.key}>
                      <dt className="text-xs font-semibold text-brand-700">
                        {f.letter} — {f.label}
                      </dt>
                      <dd className="whitespace-pre-wrap text-sm text-slate-800">{e[f.key]}</dd>
                    </div>
                  ) : null,
                )}
              </dl>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
