import type { FoodItem, NutrientSnapshot } from '../../lib/types';

export const GRAM_LABEL = 'g';

/** Parses a user-typed number (accepts comma decimals). Returns undefined when empty/invalid. */
export function parseNum(value: string | number | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  const trimmed = value.trim().replace(',', '.');
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

export function fmt(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

export const EMPTY_NUTRIENTS: NutrientSnapshot = { kcal: 0, carbs: 0, protein: 0, fat: 0, fiber: 0 };

export function addNutrients(a: NutrientSnapshot, b: NutrientSnapshot): NutrientSnapshot {
  return {
    kcal: a.kcal + b.kcal,
    carbs: a.carbs + b.carbs,
    protein: a.protein + b.protein,
    fat: a.fat + b.fat,
    fiber: a.fiber + b.fiber,
  };
}

export function measureGrams(food: FoodItem | null, measureLabel: string, quantity: number): number {
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  if (measureLabel === GRAM_LABEL) return quantity;
  const measure = food?.measures.find((m) => m.label === measureLabel);
  return measure ? quantity * measure.grams : 0;
}

export function scaleFood(food: FoodItem, grams: number): NutrientSnapshot {
  const f = grams / 100;
  return {
    kcal: food.kcalPer100g * f,
    carbs: food.carbsPer100g * f,
    protein: food.proteinPer100g * f,
    fat: food.fatPer100g * f,
    fiber: (food.fiberPer100g ?? 0) * f,
  };
}

/** Separator used to persist the substitute food name inside MealSubstitution.notes. */
export const SUB_NAME_SEPARATOR = ' | ';

export function encodeSubNotes(name: string, notes: string): string {
  const clean = notes.trim();
  return clean ? `${name}${SUB_NAME_SEPARATOR}${clean}` : name;
}

export function decodeSubNotes(notes: string | null): { name: string; notes: string } {
  if (!notes) return { name: 'Substituto', notes: '' };
  const idx = notes.indexOf(SUB_NAME_SEPARATOR);
  if (idx === -1) return { name: notes, notes: '' };
  return { name: notes.slice(0, idx), notes: notes.slice(idx + SUB_NAME_SEPARATOR.length) };
}

export function sourceTone(source: FoodItem['source']): 'teal' | 'sky' | 'amber' {
  if (source === 'TACO') return 'teal';
  if (source === 'TBCA') return 'sky';
  return 'amber';
}

export function bmiCategory(bmi: number | null | undefined): string {
  if (!bmi) return '—';
  if (bmi < 18.5) return 'Baixo peso';
  if (bmi < 25) return 'Eutrofia';
  if (bmi < 30) return 'Sobrepeso';
  if (bmi < 35) return 'Obesidade I';
  if (bmi < 40) return 'Obesidade II';
  return 'Obesidade III';
}
