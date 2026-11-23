import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeftRight, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Card, ErrorBanner, Field, Input, Select, Spinner, Textarea } from '../../components/ui';
import { createMealPlan, searchFoods } from '../../lib/queries';
import { getApiErrorMessage } from '../../lib/api';
import type {
  CreateMealPlanPayload,
  FoodItem,
  MealPlanDetail,
  MealPlanMode,
  NutrientSnapshot,
} from '../../lib/types';
import FoodPicker from './FoodPicker';
import {
  EMPTY_NUTRIENTS,
  GRAM_LABEL,
  addNutrients,
  decodeSubNotes,
  encodeSubNotes,
  fmt,
  measureGrams,
  parseNum,
  scaleFood,
  sourceTone,
} from './utils';

type DraftSub = {
  key: string;
  food: FoodItem | null;
  label: string;
  measureLabel: string;
  quantity: string;
  notes: string;
};

type DraftItem = {
  key: string;
  food: FoodItem | null;
  label: string;
  measureLabel: string;
  quantity: string;
  /** manual nutrients for free-text items (no food) */
  manual: { kcal: string; carbs: string; protein: string; fat: string };
  subs: DraftSub[];
  showSubs: boolean;
};

type DraftMeal = {
  key: string;
  name: string;
  time: string;
  notes: string;
  items: DraftItem[];
};

let counter = 0;
const uid = () => `k${++counter}`;

const DEFAULT_MEALS: [string, string][] = [
  ['Café da manhã', '07:00'],
  ['Lanche da manhã', '10:00'],
  ['Almoço', '12:30'],
  ['Lanche da tarde', '16:00'],
  ['Jantar', '19:30'],
  ['Ceia', '21:30'],
];

const MODE_LABEL: Record<MealPlanMode, string> = {
  QUANTITATIVE: 'Quantitativo (gramas/medidas)',
  EQUIVALENTS: 'Por equivalentes',
  QUALITATIVE: 'Qualitativo',
};

const newMeal = (name = '', time = ''): DraftMeal => ({ key: uid(), name, time, notes: '', items: [] });

function itemFromFood(food: FoodItem): DraftItem {
  const first = food.measures[0];
  return {
    key: uid(),
    food,
    label: food.name,
    measureLabel: first ? first.label : GRAM_LABEL,
    quantity: first ? '1' : '100',
    manual: { kcal: '', carbs: '', protein: '', fat: '' },
    subs: [],
    showSubs: false,
  };
}

function subFromFood(food: FoodItem): DraftSub {
  const first = food.measures[0];
  return {
    key: uid(),
    food,
    label: food.name,
    measureLabel: first ? first.label : GRAM_LABEL,
    quantity: first ? '1' : '100',
    notes: '',
  };
}

function itemGrams(item: DraftItem): number {
  const qty = parseNum(item.quantity) ?? 0;
  return item.food ? measureGrams(item.food, item.measureLabel, qty) : 0;
}

function itemNutrients(item: DraftItem): NutrientSnapshot {
  if (item.food) return scaleFood(item.food, itemGrams(item));
  return {
    kcal: parseNum(item.manual.kcal) ?? 0,
    carbs: parseNum(item.manual.carbs) ?? 0,
    protein: parseNum(item.manual.protein) ?? 0,
    fat: parseNum(item.manual.fat) ?? 0,
    fiber: 0,
  };
}

function subGrams(sub: DraftSub): number {
  return sub.food ? measureGrams(sub.food, sub.measureLabel, parseNum(sub.quantity) ?? 0) : 0;
}

/** Rebuilds an editable draft from a saved plan, resolving food records by name search. */
async function draftFromPlan(plan: MealPlanDetail): Promise<DraftMeal[]> {
  const cache = new Map<string, FoodItem | null>();

  async function resolve(id: string | null, name: string | null): Promise<FoodItem | null> {
    if (!id) return null;
    if (cache.has(id)) return cache.get(id) ?? null;
    let found: FoodItem | null = null;
    if (name) {
      try {
        const results = await searchFoods(name, 30);
        found = results.find((f) => f.id === id) ?? null;
      } catch {
        found = null;
      }
    }
    cache.set(id, found);
    return found;
  }

  const meals: DraftMeal[] = [];
  for (const meal of plan.meals) {
    const items: DraftItem[] = [];
    for (const it of meal.items) {
      let food = await resolve(it.foodItemId, it.customLabel);
      if (!food && it.foodItemId && it.grams > 0) {
        const f = 100 / it.grams;
        const n = it.nutrientsSnapshot;
        food = {
          id: it.foodItemId,
          clinicId: null,
          source: 'CUSTOM',
          sourceCode: null,
          name: it.customLabel ?? 'Alimento',
          category: null,
          kcalPer100g: n.kcal * f,
          carbsPer100g: n.carbs * f,
          proteinPer100g: n.protein * f,
          fatPer100g: n.fat * f,
          fiberPer100g: n.fiber * f,
          active: true,
          measures: it.quantity > 0 ? [{ id: 'm', foodItemId: it.foodItemId, label: it.measureLabel, grams: it.grams / it.quantity }] : [],
        };
      }
      const subs: DraftSub[] = [];
      for (const s of it.substitutions) {
        const d = decodeSubNotes(s.notes);
        const subFood = await resolve(s.substituteFoodItemId, d.name);
        subs.push({
          key: uid(),
          food: subFood,
          label: d.name,
          measureLabel: s.measureLabel,
          quantity: String(s.quantity),
          notes: d.notes,
        });
      }
      items.push({
        key: uid(),
        food,
        label: it.customLabel ?? food?.name ?? '',
        measureLabel: it.measureLabel,
        quantity: String(it.quantity),
        manual: {
          kcal: food ? '' : String(it.nutrientsSnapshot.kcal),
          carbs: food ? '' : String(it.nutrientsSnapshot.carbs),
          protein: food ? '' : String(it.nutrientsSnapshot.protein),
          fat: food ? '' : String(it.nutrientsSnapshot.fat),
        },
        subs,
        showSubs: subs.length > 0,
      });
    }
    meals.push({ key: uid(), name: meal.name, time: meal.scheduledTime ?? '', notes: meal.notes ?? '', items });
  }
  return meals;
}

function MeasureSelect({
  food,
  value,
  onChange,
}: {
  food: FoodItem | null;
  value: string;
  onChange: (v: string) => void;
}) {
  const labels = [...(food?.measures.map((m) => m.label) ?? [])];
  if (!labels.includes(GRAM_LABEL)) labels.push(GRAM_LABEL);
  if (!labels.includes(value)) labels.unshift(value);
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      {labels.map((l) => (
        <option key={l} value={l}>
          {l}
        </option>
      ))}
    </Select>
  );
}

export default function MealPlanBuilder({
  patientId,
  initial,
  defaultTargetKcal,
  onCancel,
  onSaved,
}: {
  patientId: string;
  initial: MealPlanDetail | null;
  defaultTargetKcal?: number;
  onCancel: () => void;
  onSaved: (plan: MealPlanDetail) => void;
}) {
  const [title, setTitle] = useState(initial ? `${initial.title} (editado)` : '');
  const [objective, setObjective] = useState(initial?.objective ?? '');
  const [mode, setMode] = useState<MealPlanMode>(initial?.mode ?? 'QUANTITATIVE');
  const [targetKcal, setTargetKcal] = useState(
    initial?.targetKcal ? String(initial.targetKcal) : defaultTargetKcal ? String(defaultTargetKcal) : '',
  );
  const [generalNotes, setGeneralNotes] = useState(initial?.generalNotes ?? '');
  const [meals, setMeals] = useState<DraftMeal[]>(() =>
    initial ? [] : DEFAULT_MEALS.slice(0, 5).map(([n, t]) => newMeal(n, t)),
  );
  const [loading, setLoading] = useState(Boolean(initial));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initial) return;
    let cancelled = false;
    draftFromPlan(initial).then((drafts) => {
      if (cancelled) return;
      setMeals(drafts);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [initial]);

  const mutation = useMutation({
    mutationFn: createMealPlan,
    onSuccess: onSaved,
    onError: (err) => setError(getApiErrorMessage(err, 'Não foi possível salvar o plano alimentar.')),
  });

  const mealTotals = useMemo(
    () =>
      meals.map((m) => m.items.reduce((acc, it) => addNutrients(acc, itemNutrients(it)), EMPTY_NUTRIENTS)),
    [meals],
  );
  const totals = useMemo(() => mealTotals.reduce(addNutrients, EMPTY_NUTRIENTS), [mealTotals]);
  const target = parseNum(targetKcal);
  const diff = target ? totals.kcal - target : null;
  const macroKcal = totals.carbs * 4 + totals.protein * 4 + totals.fat * 9;
  const pct = (kcal: number) => (macroKcal > 0 ? (kcal / macroKcal) * 100 : 0);

  function updateMeal(key: string, patch: Partial<DraftMeal>) {
    setMeals((prev) => prev.map((m) => (m.key === key ? { ...m, ...patch } : m)));
  }

  function updateItem(mealKey: string, itemKey: string, patch: Partial<DraftItem>) {
    setMeals((prev) =>
      prev.map((m) =>
        m.key === mealKey
          ? { ...m, items: m.items.map((i) => (i.key === itemKey ? { ...i, ...patch } : i)) }
          : m,
      ),
    );
  }

  function updateSub(mealKey: string, itemKey: string, subKey: string, patch: Partial<DraftSub>) {
    setMeals((prev) =>
      prev.map((m) =>
        m.key === mealKey
          ? {
              ...m,
              items: m.items.map((i) =>
                i.key === itemKey
                  ? { ...i, subs: i.subs.map((s) => (s.key === subKey ? { ...s, ...patch } : s)) }
                  : i,
              ),
            }
          : m,
      ),
    );
  }

  function addItem(mealKey: string, item: DraftItem) {
    setMeals((prev) => prev.map((m) => (m.key === mealKey ? { ...m, items: [...m.items, item] } : m)));
  }

  function removeItem(mealKey: string, itemKey: string) {
    setMeals((prev) =>
      prev.map((m) => (m.key === mealKey ? { ...m, items: m.items.filter((i) => i.key !== itemKey) } : m)),
    );
  }

  function save() {
    setError(null);
    if (!title.trim()) {
      setError('Informe o título do plano.');
      return;
    }
    if (!meals.length) {
      setError('Adicione ao menos uma refeição.');
      return;
    }
    for (const m of meals) {
      if (!m.name.trim()) {
        setError('Todas as refeições precisam de um nome.');
        return;
      }
      for (const it of m.items) {
        if (!(parseNum(it.quantity) && (parseNum(it.quantity) as number) > 0)) {
          setError(`Informe a quantidade de "${it.label || 'item'}" em ${m.name}.`);
          return;
        }
        if (!it.label.trim()) {
          setError(`Descreva todos os itens de ${m.name}.`);
          return;
        }
      }
    }

    const payload: CreateMealPlanPayload = {
      patientId,
      title: title.trim(),
      objective: objective.trim() || undefined,
      mode,
      targetKcal: target ? Math.round(target) : undefined,
      generalNotes: generalNotes.trim() || undefined,
      meals: meals.map((m) => ({
        name: m.name.trim(),
        scheduledTime: m.time.trim() || undefined,
        notes: m.notes.trim() || undefined,
        items: m.items.map((it) => {
          const n = itemNutrients(it);
          return {
            foodItemId: it.food?.id,
            customLabel: it.label.trim(),
            measureLabel: it.measureLabel.trim() || GRAM_LABEL,
            quantity: parseNum(it.quantity) as number,
            grams: Math.round(itemGrams(it) * 100) / 100,
            nutrients: it.food
              ? undefined
              : { kcal: n.kcal, carbs: n.carbs, protein: n.protein, fat: n.fat },
            substitutions: it.subs
              .filter((s) => s.label.trim() && (parseNum(s.quantity) ?? 0) > 0)
              .map((s) => ({
                substituteFoodItemId: s.food?.id,
                measureLabel: s.measureLabel.trim() || GRAM_LABEL,
                quantity: parseNum(s.quantity) as number,
                grams: Math.round(subGrams(s) * 100) / 100,
                notes: encodeSubNotes(s.label.trim(), s.notes),
              })),
          };
        }),
      })),
    };
    mutation.mutate(payload);
  }

  if (loading) {
    return (
      <Card>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <Spinner /> Carregando plano para edição...
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            {initial ? 'Editar plano (salva como novo rascunho)' : 'Novo plano alimentar'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
        {error && (
          <div className="mb-3">
            <ErrorBanner message={error} />
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <Field label="Título">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Plano emagrecimento 1.800 kcal" />
            </Field>
          </div>
          <Field label="Modo">
            <Select value={mode} onChange={(e) => setMode(e.target.value as MealPlanMode)}>
              {(Object.keys(MODE_LABEL) as MealPlanMode[]).map((m) => (
                <option key={m} value={m}>
                  {MODE_LABEL[m]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Meta (kcal)">
            <Input inputMode="numeric" value={targetKcal} onChange={(e) => setTargetKcal(e.target.value)} />
          </Field>
          <div className="sm:col-span-4">
            <Field label="Objetivo">
              <Input value={objective} onChange={(e) => setObjective(e.target.value)} />
            </Field>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-4">
        <div className="space-y-4 lg:col-span-3">
          {meals.map((meal, mealIdx) => {
            const mt = mealTotals[mealIdx];
            return (
              <Card key={meal.key}>
                <div className="mb-3 flex flex-wrap items-end gap-3">
                  <div className="w-24">
                    <Field label="Horário">
                      <Input type="time" value={meal.time} onChange={(e) => updateMeal(meal.key, { time: e.target.value })} />
                    </Field>
                  </div>
                  <div className="min-w-[10rem] flex-1">
                    <Field label="Refeição">
                      <Input value={meal.name} onChange={(e) => updateMeal(meal.key, { name: e.target.value })} />
                    </Field>
                  </div>
                  <div className="pb-2 text-right text-xs text-slate-500">
                    <span className="text-sm font-semibold text-slate-800">{fmt(mt.kcal, 0)} kcal</span>
                    <br />C {fmt(mt.carbs, 0)} · P {fmt(mt.protein, 0)} · G {fmt(mt.fat, 0)}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Remover refeição"
                    onClick={() => setMeals((prev) => prev.filter((m) => m.key !== meal.key))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  {meal.items.map((item) => {
                    const n = itemNutrients(item);
                    return (
                      <div key={item.key} className="rounded-lg border border-slate-200 p-3">
                        <div className="grid items-end gap-2 sm:grid-cols-12">
                          <div className="sm:col-span-5">
                            {item.food ? (
                              <>
                                <p className="text-xs font-medium text-slate-500">Alimento</p>
                                <div className="flex items-center gap-2">
                                  <span className="truncate text-sm font-medium text-slate-800">{item.label}</span>
                                  <Badge tone={sourceTone(item.food.source)}>{item.food.source}</Badge>
                                </div>
                              </>
                            ) : (
                              <Field label="Descrição (item livre)">
                                <Input value={item.label} onChange={(e) => updateItem(meal.key, item.key, { label: e.target.value })} />
                              </Field>
                            )}
                          </div>
                          <div className="sm:col-span-2">
                            <Field label="Qtd.">
                              <Input
                                inputMode="decimal"
                                value={item.quantity}
                                onChange={(e) => updateItem(meal.key, item.key, { quantity: e.target.value })}
                              />
                            </Field>
                          </div>
                          <div className="sm:col-span-3">
                            <Field label="Medida">
                              {item.food ? (
                                <MeasureSelect
                                  food={item.food}
                                  value={item.measureLabel}
                                  onChange={(v) => updateItem(meal.key, item.key, { measureLabel: v })}
                                />
                              ) : (
                                <Input
                                  value={item.measureLabel}
                                  onChange={(e) => updateItem(meal.key, item.key, { measureLabel: e.target.value })}
                                />
                              )}
                            </Field>
                          </div>
                          <div className="flex items-center justify-end gap-1 sm:col-span-2">
                            <Button
                              variant={item.showSubs ? 'secondary' : 'ghost'}
                              size="sm"
                              title="Substituições"
                              onClick={() => updateItem(meal.key, item.key, { showSubs: !item.showSubs })}
                            >
                              <ArrowLeftRight className="h-3.5 w-3.5" />
                              {item.subs.length > 0 && <span>{item.subs.length}</span>}
                            </Button>
                            <Button variant="ghost" size="sm" aria-label="Remover item" onClick={() => removeItem(meal.key, item.key)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {!item.food && (
                          <div className="mt-2 grid grid-cols-4 gap-2">
                            {(['kcal', 'carbs', 'protein', 'fat'] as const).map((k) => (
                              <Field key={k} label={{ kcal: 'kcal', carbs: 'Carb (g)', protein: 'Prot (g)', fat: 'Gord (g)' }[k]}>
                                <Input
                                  inputMode="decimal"
                                  value={item.manual[k]}
                                  onChange={(e) =>
                                    updateItem(meal.key, item.key, { manual: { ...item.manual, [k]: e.target.value } })
                                  }
                                />
                              </Field>
                            ))}
                          </div>
                        )}

                        <p className="mt-2 text-xs text-slate-500">
                          {item.food && <>{fmt(itemGrams(item), 0)} g · </>}
                          <span className="font-medium text-slate-700">{fmt(n.kcal, 0)} kcal</span> · C {fmt(n.carbs)} · P{' '}
                          {fmt(n.protein)} · G {fmt(n.fat)}
                        </p>

                        {item.showSubs && (
                          <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Substituições</p>
                            {item.subs.map((sub) => {
                              const subNutrients = sub.food ? scaleFood(sub.food, subGrams(sub)) : null;
                              const delta = subNutrients ? subNutrients.kcal - n.kcal : null;
                              return (
                                <div key={sub.key} className="rounded-md border border-slate-200 bg-white p-2">
                                  <div className="grid items-end gap-2 sm:grid-cols-12">
                                    <div className="sm:col-span-4">
                                      {sub.food ? (
                                        <>
                                          <p className="text-xs font-medium text-slate-500">Substituto</p>
                                          <p className="truncate text-sm text-slate-800">{sub.label}</p>
                                        </>
                                      ) : (
                                        <Field label="Substituto (livre)">
                                          <Input
                                            value={sub.label}
                                            onChange={(e) => updateSub(meal.key, item.key, sub.key, { label: e.target.value })}
                                          />
                                        </Field>
                                      )}
                                    </div>
                                    <div className="sm:col-span-2">
                                      <Field label="Qtd.">
                                        <Input
                                          inputMode="decimal"
                                          value={sub.quantity}
                                          onChange={(e) => updateSub(meal.key, item.key, sub.key, { quantity: e.target.value })}
                                        />
                                      </Field>
                                    </div>
                                    <div className="sm:col-span-3">
                                      <Field label="Medida">
                                        {sub.food ? (
                                          <MeasureSelect
                                            food={sub.food}
                                            value={sub.measureLabel}
                                            onChange={(v) => updateSub(meal.key, item.key, sub.key, { measureLabel: v })}
                                          />
                                        ) : (
                                          <Input
                                            value={sub.measureLabel}
                                            onChange={(e) =>
                                              updateSub(meal.key, item.key, sub.key, { measureLabel: e.target.value })
                                            }
                                          />
                                        )}
                                      </Field>
                                    </div>
                                    <div className="flex justify-end gap-1 sm:col-span-3">
                                      {sub.food && n.kcal > 0 && sub.food.kcalPer100g > 0 && (
                                        <Button
                                          variant="secondary"
                                          size="sm"
                                          title="Ajustar a quantidade para igualar as kcal do item original"
                                          onClick={() =>
                                            updateSub(meal.key, item.key, sub.key, {
                                              measureLabel: GRAM_LABEL,
                                              quantity: String(Math.round((n.kcal / sub.food!.kcalPer100g) * 100)),
                                            })
                                          }
                                        >
                                          = kcal
                                        </Button>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        aria-label="Remover substituição"
                                        onClick={() =>
                                          updateItem(meal.key, item.key, {
                                            subs: item.subs.filter((s) => s.key !== sub.key),
                                          })
                                        }
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="mt-2 flex items-center gap-3">
                                    <Input
                                      placeholder="Observação (opcional)"
                                      value={sub.notes}
                                      onChange={(e) => updateSub(meal.key, item.key, sub.key, { notes: e.target.value })}
                                    />
                                    {subNutrients && (
                                      <span className="whitespace-nowrap text-xs text-slate-500">
                                        {fmt(subGrams(sub), 0)} g · {fmt(subNutrients.kcal, 0)} kcal
                                        {delta !== null && Math.abs(delta) >= 1 && (
                                          <span className={delta > 0 ? ' text-amber-600' : ' text-sky-600'}>
                                            {' '}
                                            ({delta > 0 ? '+' : ''}
                                            {fmt(delta, 0)})
                                          </span>
                                        )}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                            <FoodPicker
                              placeholder="+ Adicionar alimento substituto..."
                              onSelect={(food) =>
                                updateItem(meal.key, item.key, { subs: [...item.subs, subFromFood(food)] })
                              }
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1">
                    <FoodPicker onSelect={(food) => addItem(meal.key, itemFromFood(food))} />
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      addItem(meal.key, {
                        key: uid(),
                        food: null,
                        label: '',
                        measureLabel: 'porção',
                        quantity: '1',
                        manual: { kcal: '', carbs: '', protein: '', fat: '' },
                        subs: [],
                        showSubs: false,
                      })
                    }
                  >
                    Item livre
                  </Button>
                </div>
                <div className="mt-3">
                  <Input
                    placeholder="Observações da refeição"
                    value={meal.notes}
                    onChange={(e) => updateMeal(meal.key, { notes: e.target.value })}
                  />
                </div>
              </Card>
            );
          })}

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setMeals((prev) => [...prev, newMeal()])}>
              <Plus className="h-3.5 w-3.5" /> Refeição
            </Button>
          </div>

          <Card>
            <Field label="Orientações gerais">
              <Textarea rows={3} value={generalNotes} onChange={(e) => setGeneralNotes(e.target.value)} />
            </Field>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-4 space-y-3">
            <Card>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Totais do plano</h3>
              <p className="text-3xl font-semibold text-slate-900">{fmt(totals.kcal, 0)}</p>
              <p className="text-xs text-slate-500">kcal</p>
              {target ? (
                <p className="mt-1 text-xs">
                  Meta {fmt(target, 0)} kcal{' '}
                  <span className={Math.abs(diff ?? 0) <= target * 0.05 ? 'text-emerald-600' : 'text-amber-600'}>
                    ({diff! > 0 ? '+' : ''}
                    {fmt(diff, 0)})
                  </span>
                </p>
              ) : null}
              <div className="mt-3 space-y-2 text-sm">
                {(
                  [
                    ['Carboidratos', totals.carbs, totals.carbs * 4, 'bg-amber-400'],
                    ['Proteínas', totals.protein, totals.protein * 4, 'bg-rose-400'],
                    ['Gorduras', totals.fat, totals.fat * 9, 'bg-sky-400'],
                  ] as const
                ).map(([label, grams, kcal, color]) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>{label}</span>
                      <span>
                        {fmt(grams, 0)} g · {fmt(pct(kcal), 0)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100">
                      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.min(100, pct(kcal))}%` }} />
                    </div>
                  </div>
                ))}
                <p className="pt-1 text-xs text-slate-500">Fibras: {fmt(totals.fiber, 0)} g</p>
              </div>
            </Card>
            <Button className="w-full" onClick={save} loading={mutation.isPending}>
              Salvar plano
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
