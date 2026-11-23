import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, FileText, Pencil, Plus, RefreshCw } from 'lucide-react';
import { Badge, Button, Card, EmptyState, ErrorBanner, Modal, Spinner } from '../../components/ui';
import {
  activateMealPlan,
  cloneMealPlan,
  fetchEnergyCalculations,
  fetchMealPlan,
  fetchMealPlans,
  recalcMealPlan,
} from '../../lib/queries';
import { getApiErrorMessage } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { useAuth } from '../../lib/auth';
import type { MealPlan, MealPlanDetail, MealPlanStatus, Patient } from '../../lib/types';
import MealPlanBuilder from './MealPlanBuilder';
import { printMealPlan } from './printMealPlan';
import { decodeSubNotes, fmt } from './utils';

const STATUS_LABEL: Record<MealPlanStatus, string> = { DRAFT: 'Rascunho', ACTIVE: 'Ativo', ARCHIVED: 'Arquivado' };
const STATUS_TONE: Record<MealPlanStatus, 'amber' | 'emerald' | 'slate'> = {
  DRAFT: 'amber',
  ACTIVE: 'emerald',
  ARCHIVED: 'slate',
};

export default function MealPlanTab({ patient }: { patient: Patient }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [building, setBuilding] = useState<{ initial: MealPlanDetail | null } | null>(null);
  const [viewing, setViewing] = useState<MealPlanDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const plansQuery = useQuery({
    queryKey: ['nutrition', 'meal-plans', patient.id],
    queryFn: () => fetchMealPlans({ patientId: patient.id }),
  });
  const energyQuery = useQuery({
    queryKey: ['nutrition', 'energy', patient.id],
    queryFn: () => fetchEnergyCalculations(patient.id),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['nutrition', 'meal-plans', patient.id] });
  const onError = (err: unknown) => setError(getApiErrorMessage(err, 'Operação não concluída.'));

  const activateMutation = useMutation({ mutationFn: activateMealPlan, onSuccess: refresh, onError });
  const cloneMutation = useMutation({
    mutationFn: (p: MealPlan) => cloneMealPlan(p.id, { title: `${p.title} (cópia)` }),
    onSuccess: refresh,
    onError,
  });
  const recalcMutation = useMutation({ mutationFn: recalcMealPlan, onSuccess: refresh, onError });

  async function withDetail(plan: MealPlan, action: (detail: MealPlanDetail) => void) {
    setError(null);
    setBusyId(plan.id);
    try {
      action(await fetchMealPlan(plan.id));
    } catch (err) {
      onError(err);
    } finally {
      setBusyId(null);
    }
  }

  function print(detail: MealPlanDetail) {
    const council =
      user?.councilType && user.councilNumber
        ? `${user.councilType} ${user.councilNumber}${user.councilState ? `/${user.councilState}` : ''}`
        : undefined;
    const ok = printMealPlan(detail, {
      patientName: patient.name,
      professionalName: user?.name ?? '',
      council,
    });
    if (!ok) setError('O navegador bloqueou a janela de impressão. Permita pop-ups e tente novamente.');
  }

  if (building) {
    return (
      <MealPlanBuilder
        patientId={patient.id}
        initial={building.initial}
        defaultTargetKcal={energyQuery.data?.[0]?.targetKcal}
        onCancel={() => setBuilding(null)}
        onSaved={() => {
          setBuilding(null);
          refresh();
        }}
      />
    );
  }

  const plans = plansQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Planos alimentares</h2>
        <Button onClick={() => setBuilding({ initial: null })}>
          <Plus className="h-4 w-4" /> Novo plano
        </Button>
      </div>
      {error && <ErrorBanner message={error} />}

      {plansQuery.isLoading ? (
        <Spinner />
      ) : !plans.length ? (
        <EmptyState title="Nenhum plano alimentar" description="Crie o primeiro plano com a busca de alimentos TACO/TBCA." />
      ) : (
        <div className="space-y-3">
          {plans.map((p) => (
            <Card key={p.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-left text-sm font-semibold text-slate-900 hover:text-brand-700"
                      onClick={() => withDetail(p, setViewing)}
                    >
                      {p.title}
                    </button>
                    <Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(p.createdAt)}
                    {p.calculatedTotals && (
                      <>
                        {' '}
                        · {fmt(p.calculatedTotals.kcal, 0)} kcal · C {fmt(p.calculatedTotals.carbs, 0)} · P{' '}
                        {fmt(p.calculatedTotals.protein, 0)} · G {fmt(p.calculatedTotals.fat, 0)}
                      </>
                    )}
                    {p.targetKcal ? ` · meta ${fmt(p.targetKcal, 0)} kcal` : ''}
                  </p>
                  {p.objective && <p className="mt-1 text-sm text-slate-600">{p.objective}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button variant="secondary" size="sm" loading={busyId === p.id} onClick={() => withDetail(p, print)}>
                    <FileText className="h-3.5 w-3.5" /> PDF
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => withDetail(p, (d) => setBuilding({ initial: d }))}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={cloneMutation.isPending && cloneMutation.variables?.id === p.id}
                    onClick={() => cloneMutation.mutate(p)}
                  >
                    <Copy className="h-3.5 w-3.5" /> Clonar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Recalcular totais"
                    loading={recalcMutation.isPending && recalcMutation.variables === p.id}
                    onClick={() => recalcMutation.mutate(p.id)}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                  {p.status !== 'ACTIVE' && (
                    <Button
                      size="sm"
                      loading={activateMutation.isPending && activateMutation.variables === p.id}
                      onClick={() => activateMutation.mutate(p.id)}
                    >
                      Ativar
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {viewing && (
        <Modal title={viewing.title} onClose={() => setViewing(null)} widthClassName="max-w-3xl">
          <div className="space-y-4">
            {viewing.objective && <p className="text-sm text-slate-600">{viewing.objective}</p>}
            {viewing.meals.map((meal) => (
              <div key={meal.id}>
                <p className="mb-1 rounded-md bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-800">
                  {meal.scheduledTime ? `${meal.scheduledTime} — ` : ''}
                  {meal.name}
                </p>
                <ul className="space-y-1 px-1 text-sm text-slate-700">
                  {meal.items.map((it) => (
                    <li key={it.id}>
                      <span className="font-medium">{it.customLabel ?? 'Alimento'}</span> — {fmt(it.quantity, 2)}{' '}
                      {it.measureLabel}
                      {it.grams ? ` (${fmt(it.grams, 0)} g)` : ''} ·{' '}
                      <span className="text-slate-500">{fmt(it.nutrientsSnapshot.kcal, 0)} kcal</span>
                      {it.substitutions.length > 0 && (
                        <ul className="ml-4 list-disc text-xs text-slate-500">
                          {it.substitutions.map((s) => {
                            const d = decodeSubNotes(s.notes);
                            return (
                              <li key={s.id}>
                                ou {d.name} — {fmt(s.quantity, 2)} {s.measureLabel}
                                {s.grams ? ` (${fmt(s.grams, 0)} g)` : ''}
                                {d.notes ? ` · ${d.notes}` : ''}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  ))}
                  {!meal.items.length && <li className="text-slate-400">Sem itens</li>}
                </ul>
              </div>
            ))}
            {viewing.calculatedTotals && (
              <p className="border-t border-slate-100 pt-3 text-sm text-slate-700">
                Total: <strong>{fmt(viewing.calculatedTotals.kcal, 0)} kcal</strong> · C{' '}
                {fmt(viewing.calculatedTotals.carbs, 0)} g · P {fmt(viewing.calculatedTotals.protein, 0)} g · G{' '}
                {fmt(viewing.calculatedTotals.fat, 0)} g · Fibras {fmt(viewing.calculatedTotals.fiber, 0)} g
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => print(viewing)}>
                <FileText className="h-4 w-4" /> PDF
              </Button>
              <Button variant="ghost" onClick={() => setViewing(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
