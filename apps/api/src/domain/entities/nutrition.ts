import type {
  EnergyFormula,
  FoodSource,
  MealPlanMode,
  MealPlanStatus,
  NutritionEvolutionFormat,
} from "./enums";

export type NutritionAnamnesis = {
  id: string;
  clinicId: string;
  patientId: string;
  professionalId: string;
  responses: Record<string, unknown>;
  recordedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type AnthropometricAssessment = {
  id: string;
  clinicId: string;
  patientId: string;
  professionalId: string;
  measuredAt: Date;
  weightKg: number;
  heightCm: number;
  bmi: number | null;
  circumferences: Record<string, unknown> | null;
  skinfolds: Record<string, unknown> | null;
  bodyFatProtocol: string | null;
  bodyFatPct: number | null;
  leanMassKg: number | null;
  fatMassKg: number | null;
  bioimpedance: Record<string, unknown> | null;
  notes: string | null;
  createdAt: Date;
};

export type EnergyCalculation = {
  id: string;
  clinicId: string;
  patientId: string;
  professionalId: string;
  assessmentId: string | null;
  formula: EnergyFormula;
  activityFactor: number;
  bmrKcal: number;
  tdeeKcal: number;
  targetKcal: number;
  carbPct: number;
  proteinPct: number;
  fatPct: number;
  proteinGPerKg: number | null;
  notes: string | null;
  createdAt: Date;
};

/** Macro/energy values of a quantity of food (scaled from per-100g values). */
export type NutrientSnapshot = {
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
};

export type FoodMeasure = {
  id: string;
  foodItemId: string;
  label: string;
  grams: number;
};

export type FoodItem = {
  id: string;
  clinicId: string | null;
  source: FoodSource;
  sourceCode: string | null;
  name: string;
  category: string | null;
  kcalPer100g: number;
  carbsPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  fiberPer100g: number | null;
  active: boolean;
  createdAt: Date;
};

export type FoodItemWithMeasures = FoodItem & {
  measures: FoodMeasure[];
};

export type MealSubstitution = {
  id: string;
  mealItemId: string;
  substituteFoodItemId: string | null;
  measureLabel: string;
  quantity: number;
  grams: number;
  notes: string | null;
};

export type MealItem = {
  id: string;
  mealId: string;
  foodItemId: string | null;
  customLabel: string | null;
  measureLabel: string;
  quantity: number;
  grams: number;
  nutrientsSnapshot: NutrientSnapshot;
  sortOrder: number;
  substitutions: MealSubstitution[];
};

export type Meal = {
  id: string;
  mealPlanId: string;
  name: string;
  scheduledTime: string | null;
  sortOrder: number;
  notes: string | null;
  items: MealItem[];
};

export type MealPlanTotals = NutrientSnapshot;

export type MealPlan = {
  id: string;
  clinicId: string;
  patientId: string;
  professionalId: string;
  title: string;
  objective: string | null;
  mode: MealPlanMode;
  status: MealPlanStatus;
  targetKcal: number | null;
  calculatedTotals: MealPlanTotals | null;
  generalNotes: string | null;
  clonedFromId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MealPlanDetail = MealPlan & {
  meals: Meal[];
};

export type NutritionEvolution = {
  id: string;
  clinicId: string;
  patientId: string;
  professionalId: string;
  format: NutritionEvolutionFormat;
  assessment: string | null;
  nutritionDiagnosis: string | null;
  intervention: string | null;
  monitoringEvaluation: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PatientGoal = {
  id: string;
  clinicId: string;
  patientId: string;
  professionalId: string;
  title: string;
  metricType: string;
  targetValue: string | null;
  currentValue: string | null;
  dueDate: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};
