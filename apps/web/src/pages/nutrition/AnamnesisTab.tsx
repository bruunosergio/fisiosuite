import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Card, EmptyState, ErrorBanner, Field, Input, Select, Spinner, Textarea } from '../../components/ui';
import { createNutritionAnamnesis, fetchNutritionAnamneses } from '../../lib/queries';
import { getApiErrorMessage } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import type { Patient } from '../../lib/types';

type FieldDef = { key: string; label: string; type?: 'text' | 'area' | 'select'; options?: string[]; placeholder?: string };

const SECTIONS: { title: string; fields: FieldDef[] }[] = [
  {
    title: 'Motivo e objetivo',
    fields: [
      { key: 'chiefComplaint', label: 'Motivo da consulta', type: 'area' },
      { key: 'goal', label: 'Objetivo do paciente', type: 'area' },
      { key: 'history', label: 'Histórico de saúde / doenças', type: 'area' },
      { key: 'familyHistory', label: 'Histórico familiar', type: 'area' },
      { key: 'medications', label: 'Medicamentos e suplementos em uso', type: 'area' },
    ],
  },
  {
    title: 'Hábitos alimentares',
    fields: [
      { key: 'allergies', label: 'Alergias e intolerâncias', type: 'area' },
      { key: 'aversions', label: 'Aversões / preferências alimentares', type: 'area' },
      { key: 'mealsPerDay', label: 'Refeições por dia', type: 'text', placeholder: 'Ex.: 5' },
      { key: 'mealLocation', label: 'Onde faz as refeições', type: 'text', placeholder: 'Casa, trabalho, restaurante...' },
      { key: 'cooks', label: 'Quem prepara as refeições', type: 'text' },
      { key: 'recall24h', label: 'Recordatório alimentar de 24h', type: 'area' },
    ],
  },
  {
    title: 'Estilo de vida',
    fields: [
      { key: 'waterIntake', label: 'Ingestão de água (L/dia)', type: 'text' },
      { key: 'bowel', label: 'Funcionamento intestinal', type: 'select', options: ['Regular', 'Constipação', 'Diarreia', 'Alternado'] },
      { key: 'sleep', label: 'Sono (horas/qualidade)', type: 'text' },
      { key: 'physicalActivity', label: 'Atividade física (tipo/frequência)', type: 'area' },
      { key: 'smoking', label: 'Tabagismo', type: 'select', options: ['Não', 'Ex-fumante', 'Sim'] },
      { key: 'alcohol', label: 'Consumo de álcool', type: 'select', options: ['Não', 'Social', 'Frequente'] },
      { key: 'notes', label: 'Observações gerais', type: 'area' },
    ],
  },
];

const LABELS: Record<string, string> = Object.fromEntries(
  SECTIONS.flatMap((s) => s.fields.map((f) => [f.key, f.label])),
);

export default function AnamnesisTab({ patient }: { patient: Patient }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['nutrition', 'anamneses', patient.id],
    queryFn: () => fetchNutritionAnamneses(patient.id),
  });

  const mutation = useMutation({
    mutationFn: createNutritionAnamnesis,
    onSuccess: () => {
      setForm({});
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['nutrition', 'anamneses', patient.id] });
    },
    onError: (err) => setError(getApiErrorMessage(err, 'Não foi possível salvar a anamnese.')),
  });

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function save() {
    setError(null);
    const responses = Object.fromEntries(Object.entries(form).filter(([, v]) => v.trim() !== ''));
    if (!Object.keys(responses).length) {
      setError('Preencha ao menos um campo da anamnese.');
      return;
    }
    mutation.mutate({ patientId: patient.id, responses });
  }

  function copyLatest() {
    const latest = query.data?.[0];
    if (!latest) return;
    setForm(Object.fromEntries(Object.entries(latest.responses).map(([k, v]) => [k, String(v ?? '')])));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Nova anamnese</h2>
          <Button variant="ghost" size="sm" onClick={copyLatest} disabled={!query.data?.length}>
            Copiar da última
          </Button>
        </div>
        {error && (
          <div className="mb-3">
            <ErrorBanner message={error} />
          </div>
        )}
        <div className="space-y-6">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{section.title}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {section.fields.map((f) => (
                  <div key={f.key} className={f.type === 'area' ? 'sm:col-span-2' : ''}>
                    <Field label={f.label}>
                      {f.type === 'area' ? (
                        <Textarea rows={2} value={form[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} />
                      ) : f.type === 'select' ? (
                        <Select value={form[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)}>
                          <option value="">Selecione</option>
                          {f.options?.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <Input
                          value={form[f.key] ?? ''}
                          placeholder={f.placeholder}
                          onChange={(e) => set(f.key, e.target.value)}
                        />
                      )}
                    </Field>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={save} loading={mutation.isPending}>
            Salvar anamnese
          </Button>
        </div>
      </Card>

      <div className="space-y-3 lg:col-span-2">
        <h2 className="text-base font-semibold text-slate-900">Histórico</h2>
        {query.isLoading ? (
          <Spinner />
        ) : !query.data?.length ? (
          <EmptyState title="Nenhuma anamnese registrada" />
        ) : (
          query.data.map((a) => (
            <Card key={a.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => setOpenId(openId === a.id ? null : a.id)}
              >
                <span className="text-sm font-medium text-slate-800">{formatDateTime(a.recordedAt)}</span>
                <span className="text-xs text-brand-700">{openId === a.id ? 'Ocultar' : 'Ver respostas'}</span>
              </button>
              {openId === a.id && (
                <dl className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                  {Object.entries(a.responses).map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-xs font-medium text-slate-500">{LABELS[k] ?? k}</dt>
                      <dd className="whitespace-pre-wrap text-sm text-slate-800">{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
