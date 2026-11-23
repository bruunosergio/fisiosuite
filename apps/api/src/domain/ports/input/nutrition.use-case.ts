import type { Result } from "../../core/result";
import type { Failure } from "../../failures";
import type {
  AnthropometricAssessment,
  BiologicalSex,
  EnergyCalculation,
  EnergyFormula,
  FoodItemWithMeasures,
  MealPlan,
  MealPlanDetail,
  MealPlanMode,
  MealPlanStatus,
  NutrientSnapshot,
  NutritionAnamnesis,
  NutritionEvolution,
  NutritionEvolutionFormat,
  PatientGoal,
} from "../../entities";

export type CreateNutritionAnamnesisCommand = {
  clinicId: string;
  patientId: string;
  professionalId: string;
  responses: Record<string, unknown>;
  recordedAt?: Date;
};

export type CreateAnthropometryCommand = {
  clinicId: string;
  patientId: string;
  professionalId: string;
  measuredAt?: Date;
  weightKg: number;
  heightCm: number;
  circumferences?: Record<string, unknown> | null;
  skinfolds?: Record<string, unknown> | null;
  bodyFatProtocol?: string | null;
  bodyFatPct?: number | null;
  leanMassKg?: number | null;
  fatMassKg?: number | null;
  bioimpedance?: Record<string, unknown> | null;
  notes?: string | null;
};

export type CreateEnergyCalculationCommand = {
  clinicId: string;
  patientId: string;
  professionalId: string;
  assessmentId?: string | null;
  formula: EnergyFormula;
  activityFactor: number;
  /** Overrides assessment/latest assessment weight. */
  weightKg?: number;
  /** Overrides assessment/latest assessment height. */
  heightCm?: number;
  /** Overrides patient's biological sex. */
  sex?: BiologicalSex;
  /** Required when formula is CUSTOM. */
  customBmrKcal?: number;
  /** Explicit target kcal (otherwise TDEE + kcalAdjustment). */
  targetKcal?: number;
  /** Positive (surplus) or negative (deficit) kcal applied over TDEE. */
  kcalAdjustment?: number;
  carbPct: number;
  proteinPct: number;
  fatPct: number;
  proteinGPerKg?: number | null;
  notes?: string | null;
};

export type MacroGrams = {
  carbsG: number;
  proteinG: number;
  fatG: number;
};

export type EnergyCalculationDetail = EnergyCalculation & {
  macros: MacroGrams;
};

export type SearchFoodsQuery = {
  clinicId: string;
  query: string;
  limit?: number;
};

export type CreateCustomFoodCommand = {
  clinicId: string;
  name: string;
  category?: string | null;
  kcalPer100g: number;
  carbsPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  fiberPer100g?: number | null;
  measures?: Array<{ label: string; grams: number }>;
};

export type MealSubstitutionInput = {
  substituteFoodItemId?: string | null;
  measureLabel: string;
  quantity: number;
  grams?: number;
  notes?: string | null;
};

export type MealItemInput = {
  foodItemId?: string | null;
  customLabel?: string | null;
  measureLabel: string;
  quantity: number;
  /** Explicit grams. Otherwise derived from the food measure (or quantity if label is grams). */
  grams?: number;
  /** Only used for free-text items (no foodItemId). */
  nutrients?: Partial<NutrientSnapshot>;
  substitutions?: MealSubstitutionInput[];
};

export type MealInput = {
  name: string;
  scheduledTime?: string | null;
  notes?: string | null;
  items?: MealItemInput[];
};

export type CreateMealPlanCommand = {
  clinicId: string;
  patientId: string;
  professionalId: string;
  title: string;
  objective?: string | null;
  mode?: MealPlanMode;
  targetKcal?: number | null;
  generalNotes?: string | null;
  meals?: MealInput[];
};

export type CloneMealPlanCommand = {
  clinicId: string;
  mealPlanId: string;
  professionalId: string;
  title?: string;
  /** Clone for another patient (defaults to the source patient). */
  patientId?: string;
};

export type CreateNutritionEvolutionCommand = {
  clinicId: string;
  patientId: string;
  professionalId: string;
  format?: NutritionEvolutionFormat;
  assessment?: string | null;
  nutritionDiagnosis?: string | null;
  intervention?: string | null;
  monitoringEvaluation?: string | null;
};

export type CreatePatientGoalCommand = {
  clinicId: string;
  patientId: string;
  professionalId: string;
  title: string;
  metricType: string;
  targetValue?: string | null;
  currentValue?: string | null;
  dueDate?: Date | null;
  status?: string;
};

export interface NutritionUseCase {
  createAnamnesis(
    cmd: CreateNutritionAnamnesisCommand,
  ): Promise<Result<NutritionAnamnesis, Failure>>;
  listAnamneses(
    clinicId: string,
    patientId: string,
  ): Promise<Result<NutritionAnamnesis[], Failure>>;

  createAnthropometry(
    cmd: CreateAnthropometryCommand,
  ): Promise<Result<AnthropometricAssessment, Failure>>;
  listAnthropometry(
    clinicId: string,
    patientId: string,
  ): Promise<Result<AnthropometricAssessment[], Failure>>;

  createEnergyCalculation(
    cmd: CreateEnergyCalculationCommand,
  ): Promise<Result<EnergyCalculationDetail, Failure>>;
  listEnergyCalculations(
    clinicId: string,
    patientId: string,
  ): Promise<Result<EnergyCalculationDetail[], Failure>>;

  searchFoods(
    query: SearchFoodsQuery,
  ): Promise<Result<FoodItemWithMeasures[], Failure>>;
  createCustomFood(
    cmd: CreateCustomFoodCommand,
  ): Promise<Result<FoodItemWithMeasures, Failure>>;

  createMealPlan(
    cmd: CreateMealPlanCommand,
  ): Promise<Result<MealPlanDetail, Failure>>;
  getMealPlan(
    clinicId: string,
    id: string,
  ): Promise<Result<MealPlanDetail, Failure>>;
  listMealPlans(
    clinicId: string,
    patientId?: string,
    status?: MealPlanStatus,
  ): Promise<Result<MealPlan[], Failure>>;
  activateMealPlan(
    clinicId: string,
    id: string,
  ): Promise<Result<MealPlanDetail, Failure>>;
  cloneMealPlan(
    cmd: CloneMealPlanCommand,
  ): Promise<Result<MealPlanDetail, Failure>>;
  recalcMealPlan(
    clinicId: string,
    id: string,
  ): Promise<Result<MealPlanDetail, Failure>>;

  createEvolution(
    cmd: CreateNutritionEvolutionCommand,
  ): Promise<Result<NutritionEvolution, Failure>>;
  listEvolutions(
    clinicId: string,
    patientId: string,
  ): Promise<Result<NutritionEvolution[], Failure>>;

  createGoal(
    cmd: CreatePatientGoalCommand,
  ): Promise<Result<PatientGoal, Failure>>;
  listGoals(
    clinicId: string,
    patientId: string,
  ): Promise<Result<PatientGoal[], Failure>>;
}
