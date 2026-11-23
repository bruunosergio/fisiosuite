import type {
  AnthropometricAssessment,
  EnergyCalculation,
  FoodItem,
  FoodItemWithMeasures,
  FoodMeasure,
  MealPlan,
  MealPlanDetail,
  MealPlanStatus,
  MealPlanTotals,
  NutritionAnamnesis,
  NutritionEvolution,
  PatientGoal,
} from "../../entities";

export interface NutritionRepository {
  // Anamnesis
  createAnamnesis(anamnesis: NutritionAnamnesis): Promise<NutritionAnamnesis>;
  listAnamnesesByPatient(
    clinicId: string,
    patientId: string,
  ): Promise<NutritionAnamnesis[]>;

  // Anthropometry
  createAssessment(
    assessment: AnthropometricAssessment,
  ): Promise<AnthropometricAssessment>;
  findAssessment(
    clinicId: string,
    id: string,
  ): Promise<AnthropometricAssessment | null>;
  findLatestAssessment(
    clinicId: string,
    patientId: string,
  ): Promise<AnthropometricAssessment | null>;
  listAssessmentsByPatient(
    clinicId: string,
    patientId: string,
  ): Promise<AnthropometricAssessment[]>;

  // Energy
  createEnergyCalculation(
    calculation: EnergyCalculation,
  ): Promise<EnergyCalculation>;
  listEnergyCalculationsByPatient(
    clinicId: string,
    patientId: string,
  ): Promise<EnergyCalculation[]>;

  // Foods
  searchFoods(
    clinicId: string,
    query: string,
    limit: number,
  ): Promise<FoodItemWithMeasures[]>;
  findFoodsByIds(
    clinicId: string,
    ids: string[],
  ): Promise<FoodItemWithMeasures[]>;
  createFood(
    food: FoodItem,
    measures: FoodMeasure[],
  ): Promise<FoodItemWithMeasures>;

  // Meal plans
  createMealPlan(plan: MealPlanDetail): Promise<MealPlanDetail>;
  findMealPlan(clinicId: string, id: string): Promise<MealPlanDetail | null>;
  listMealPlans(
    clinicId: string,
    patientId?: string,
    status?: MealPlanStatus,
  ): Promise<MealPlan[]>;
  updateMealPlanTotals(planId: string, totals: MealPlanTotals): Promise<void>;
  /** Archives any other ACTIVE plan of the patient and activates the given one. */
  activateMealPlan(
    clinicId: string,
    patientId: string,
    planId: string,
  ): Promise<MealPlan>;

  // Evolutions
  createEvolution(evolution: NutritionEvolution): Promise<NutritionEvolution>;
  listEvolutionsByPatient(
    clinicId: string,
    patientId: string,
  ): Promise<NutritionEvolution[]>;

  // Goals
  createGoal(goal: PatientGoal): Promise<PatientGoal>;
  listGoalsByPatient(
    clinicId: string,
    patientId: string,
  ): Promise<PatientGoal[]>;
}
