import { Result } from "../core/result";
import type { Failure } from "../failures";
import { NotFoundFailure, ValidationFailure } from "../failures";
import {
  BiologicalSex,
  EnergyFormula,
  FoodSource,
  MealPlanMode,
  MealPlanStatus,
  NutritionEvolutionFormat,
  type AnthropometricAssessment,
  type EnergyCalculation,
  type FoodItem,
  type FoodItemWithMeasures,
  type FoodMeasure,
  type Meal,
  type MealItem,
  type MealPlan,
  type MealPlanDetail,
  type MealPlanTotals,
  type MealSubstitution,
  type NutrientSnapshot,
  type NutritionAnamnesis,
  type NutritionEvolution,
  type Patient,
  type PatientGoal,
} from "../entities";
import type {
  CloneMealPlanCommand,
  CreateAnthropometryCommand,
  CreateCustomFoodCommand,
  CreateEnergyCalculationCommand,
  CreateMealPlanCommand,
  CreateNutritionAnamnesisCommand,
  CreateNutritionEvolutionCommand,
  CreatePatientGoalCommand,
  EnergyCalculationDetail,
  MealItemInput,
  NutritionUseCase,
  SearchFoodsQuery,
} from "../ports/input/nutrition.use-case";
import type {
  IdGeneratorPort,
  NutritionRepository,
  PatientRepository,
} from "../ports/output";

const DEFAULT_AGE = 30;
const DEFAULT_FOOD_SEARCH_LIMIT = 30;
const MAX_FOOD_SEARCH_LIMIT = 100;
const MACRO_SUM_TOLERANCE = 0.5;
const GRAM_LABELS = new Set(["g", "gr", "grama", "gramas"]);

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function clean(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Age in full years from a birth date; falls back to 30 when unknown. */
export function ageFromBirthDate(
  birthDate: Date | null | undefined,
  now = new Date(),
): number {
  if (!birthDate) return DEFAULT_AGE;
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate()))
    age -= 1;
  return age > 0 ? age : DEFAULT_AGE;
}

/** Mifflin-St Jeor (kcal/day). weight in kg, height in cm. */
export function mifflinBmr(
  sex: "MALE" | "FEMALE",
  weightKg: number,
  heightCm: number,
  age: number,
) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "FEMALE" ? base - 161 : base + 5;
}

/** Harris-Benedict (kcal/day). weight in kg, height in cm. */
export function harrisBenedictBmr(
  sex: "MALE" | "FEMALE",
  weightKg: number,
  heightCm: number,
  age: number,
) {
  return sex === "FEMALE"
    ? 655.1 + 9.563 * weightKg + 1.85 * heightCm - 4.676 * age
    : 66.5 + 13.75 * weightKg + 5.003 * heightCm - 6.75 * age;
}

/** BMI = weight / (height in meters)^2 */
export function calcBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return round(weightKg / (heightM * heightM));
}

/** Scales per-100g values to the given grams. */
export function scaleNutrients(
  food: Pick<
    FoodItem,
    | "kcalPer100g"
    | "carbsPer100g"
    | "proteinPer100g"
    | "fatPer100g"
    | "fiberPer100g"
  >,
  grams: number,
): NutrientSnapshot {
  const factor = grams / 100;
  return {
    kcal: round(food.kcalPer100g * factor),
    carbs: round(food.carbsPer100g * factor),
    protein: round(food.proteinPer100g * factor),
    fat: round(food.fatPer100g * factor),
    fiber: round((food.fiberPer100g ?? 0) * factor),
  };
}

/** Sums every item snapshot of every meal (substitutions are not counted). */
export function sumMealTotals(
  meals: Array<Pick<Meal, "items">>,
): MealPlanTotals {
  const totals: MealPlanTotals = {
    kcal: 0,
    carbs: 0,
    protein: 0,
    fat: 0,
    fiber: 0,
  };
  for (const meal of meals) {
    for (const item of meal.items) {
      totals.kcal += item.nutrientsSnapshot.kcal;
      totals.carbs += item.nutrientsSnapshot.carbs;
      totals.protein += item.nutrientsSnapshot.protein;
      totals.fat += item.nutrientsSnapshot.fat;
      totals.fiber += item.nutrientsSnapshot.fiber;
    }
  }
  return {
    kcal: round(totals.kcal),
    carbs: round(totals.carbs),
    protein: round(totals.protein),
    fat: round(totals.fat),
    fiber: round(totals.fiber),
  };
}

function withMacros(calc: EnergyCalculation): EnergyCalculationDetail {
  return {
    ...calc,
    macros: {
      carbsG: round((calc.targetKcal * calc.carbPct) / 100 / 4, 1),
      proteinG: round((calc.targetKcal * calc.proteinPct) / 100 / 4, 1),
      fatG: round((calc.targetKcal * calc.fatPct) / 100 / 9, 1),
    },
  };
}

export class NutritionUseCaseImpl implements NutritionUseCase {
  constructor(
    private readonly nutrition: NutritionRepository,
    private readonly patients: PatientRepository,
    private readonly ids: IdGeneratorPort,
  ) {}

  // ---------- Anamnesis ----------

  async createAnamnesis(
    cmd: CreateNutritionAnamnesisCommand,
  ): Promise<Result<NutritionAnamnesis, Failure>> {
    const patient = await this.findPatient(cmd.clinicId, cmd.patientId);
    if (!patient)
      return Result.error(new NotFoundFailure("Paciente", cmd.patientId));
    if (
      !cmd.responses ||
      typeof cmd.responses !== "object" ||
      Array.isArray(cmd.responses)
    ) {
      return Result.error(
        new ValidationFailure("Respostas da anamnese são obrigatórias."),
      );
    }
    const now = new Date();
    const anamnesis: NutritionAnamnesis = {
      id: this.ids.generate(),
      clinicId: cmd.clinicId,
      patientId: cmd.patientId,
      professionalId: cmd.professionalId,
      responses: cmd.responses,
      recordedAt: cmd.recordedAt ?? now,
      createdAt: now,
      updatedAt: now,
    };
    return Result.ok(await this.nutrition.createAnamnesis(anamnesis));
  }

  async listAnamneses(
    clinicId: string,
    patientId: string,
  ): Promise<Result<NutritionAnamnesis[], Failure>> {
    const patient = await this.findPatient(clinicId, patientId);
    if (!patient)
      return Result.error(new NotFoundFailure("Paciente", patientId));
    return Result.ok(
      await this.nutrition.listAnamnesesByPatient(clinicId, patientId),
    );
  }

  // ---------- Anthropometry ----------

  async createAnthropometry(
    cmd: CreateAnthropometryCommand,
  ): Promise<Result<AnthropometricAssessment, Failure>> {
    const patient = await this.findPatient(cmd.clinicId, cmd.patientId);
    if (!patient)
      return Result.error(new NotFoundFailure("Paciente", cmd.patientId));

    if (!isFiniteNumber(cmd.weightKg) || cmd.weightKg <= 0) {
      return Result.error(
        new ValidationFailure("Peso deve ser maior que zero."),
      );
    }
    if (!isFiniteNumber(cmd.heightCm) || cmd.heightCm <= 0) {
      return Result.error(
        new ValidationFailure("Altura deve ser maior que zero."),
      );
    }
    if (
      cmd.bodyFatPct != null &&
      (cmd.bodyFatPct < 0 || cmd.bodyFatPct > 100)
    ) {
      return Result.error(
        new ValidationFailure("Percentual de gordura inválido."),
      );
    }

    let fatMassKg = cmd.fatMassKg ?? null;
    let leanMassKg = cmd.leanMassKg ?? null;
    if (cmd.bodyFatPct != null) {
      if (fatMassKg == null)
        fatMassKg = round((cmd.weightKg * cmd.bodyFatPct) / 100);
      if (leanMassKg == null) leanMassKg = round(cmd.weightKg - fatMassKg);
    }

    const assessment: AnthropometricAssessment = {
      id: this.ids.generate(),
      clinicId: cmd.clinicId,
      patientId: cmd.patientId,
      professionalId: cmd.professionalId,
      measuredAt: cmd.measuredAt ?? new Date(),
      weightKg: cmd.weightKg,
      heightCm: cmd.heightCm,
      bmi: calcBmi(cmd.weightKg, cmd.heightCm),
      circumferences: cmd.circumferences ?? null,
      skinfolds: cmd.skinfolds ?? null,
      bodyFatProtocol: clean(cmd.bodyFatProtocol),
      bodyFatPct: cmd.bodyFatPct ?? null,
      leanMassKg,
      fatMassKg,
      bioimpedance: cmd.bioimpedance ?? null,
      notes: clean(cmd.notes),
      createdAt: new Date(),
    };
    return Result.ok(await this.nutrition.createAssessment(assessment));
  }

  async listAnthropometry(
    clinicId: string,
    patientId: string,
  ): Promise<Result<AnthropometricAssessment[], Failure>> {
    const patient = await this.findPatient(clinicId, patientId);
    if (!patient)
      return Result.error(new NotFoundFailure("Paciente", patientId));
    return Result.ok(
      await this.nutrition.listAssessmentsByPatient(clinicId, patientId),
    );
  }

  // ---------- Energy ----------

  async createEnergyCalculation(
    cmd: CreateEnergyCalculationCommand,
  ): Promise<Result<EnergyCalculationDetail, Failure>> {
    const patient = await this.findPatient(cmd.clinicId, cmd.patientId);
    if (!patient)
      return Result.error(new NotFoundFailure("Paciente", cmd.patientId));

    if (!isFiniteNumber(cmd.activityFactor) || cmd.activityFactor <= 0) {
      return Result.error(
        new ValidationFailure("Fator de atividade deve ser maior que zero."),
      );
    }

    const macroSum = cmd.carbPct + cmd.proteinPct + cmd.fatPct;
    if (
      [cmd.carbPct, cmd.proteinPct, cmd.fatPct].some(
        (p) => !isFiniteNumber(p) || p < 0,
      ) ||
      Math.abs(macroSum - 100) > MACRO_SUM_TOLERANCE
    ) {
      return Result.error(
        new ValidationFailure(
          "Percentuais de macronutrientes devem somar 100%.",
        ),
      );
    }

    // Resolve anthropometric reference
    let assessment: AnthropometricAssessment | null = null;
    if (cmd.assessmentId) {
      assessment = await this.nutrition.findAssessment(
        cmd.clinicId,
        cmd.assessmentId,
      );
      if (!assessment) {
        return Result.error(
          new NotFoundFailure("Avaliação antropométrica", cmd.assessmentId),
        );
      }
      if (assessment.patientId !== cmd.patientId) {
        return Result.error(
          new ValidationFailure(
            "Avaliação antropométrica não pertence a este paciente.",
          ),
        );
      }
    } else if (cmd.weightKg == null || cmd.heightCm == null) {
      assessment = await this.nutrition.findLatestAssessment(
        cmd.clinicId,
        cmd.patientId,
      );
    }

    const weightKg = cmd.weightKg ?? assessment?.weightKg;
    const heightCm = cmd.heightCm ?? assessment?.heightCm;
    if (
      !isFiniteNumber(weightKg) ||
      weightKg <= 0 ||
      !isFiniteNumber(heightCm) ||
      heightCm <= 0
    ) {
      return Result.error(
        new ValidationFailure(
          "Informe peso e altura ou registre uma avaliação antropométrica.",
        ),
      );
    }

    // Resolve BMR
    let bmr: number;
    if (cmd.formula === EnergyFormula.CUSTOM) {
      if (!isFiniteNumber(cmd.customBmrKcal) || cmd.customBmrKcal <= 0) {
        return Result.error(
          new ValidationFailure(
            "Informe a TMB personalizada para a fórmula CUSTOM.",
          ),
        );
      }
      bmr = cmd.customBmrKcal;
    } else if (
      cmd.formula === EnergyFormula.MIFFLIN ||
      cmd.formula === EnergyFormula.HARRIS_BENEDICT
    ) {
      const sexValue = cmd.sex ?? patient.biologicalSex;
      if (
        sexValue !== BiologicalSex.FEMALE &&
        sexValue !== BiologicalSex.MALE
      ) {
        return Result.error(
          new ValidationFailure(
            "Sexo biológico (masculino/feminino) é necessário para o cálculo.",
          ),
        );
      }
      const sex: "MALE" | "FEMALE" =
        sexValue === BiologicalSex.FEMALE ? "FEMALE" : "MALE";
      const age = ageFromBirthDate(patient.birthDate);
      bmr =
        cmd.formula === EnergyFormula.MIFFLIN
          ? mifflinBmr(sex, weightKg, heightCm, age)
          : harrisBenedictBmr(sex, weightKg, heightCm, age);
    } else {
      return Result.error(
        new ValidationFailure(`Fórmula não suportada: ${cmd.formula}.`),
      );
    }

    const bmrKcal = Math.round(bmr);
    const tdeeKcal = Math.round(bmr * cmd.activityFactor);
    const targetKcal = Math.round(
      cmd.targetKcal ?? tdeeKcal + (cmd.kcalAdjustment ?? 0),
    );
    if (targetKcal <= 0) {
      return Result.error(
        new ValidationFailure("Meta calórica deve ser maior que zero."),
      );
    }

    const proteinGPerKg =
      cmd.proteinGPerKg ??
      round((targetKcal * (cmd.proteinPct / 100)) / 4 / weightKg);

    const calculation: EnergyCalculation = {
      id: this.ids.generate(),
      clinicId: cmd.clinicId,
      patientId: cmd.patientId,
      professionalId: cmd.professionalId,
      assessmentId: assessment?.id ?? cmd.assessmentId ?? null,
      formula: cmd.formula,
      activityFactor: cmd.activityFactor,
      bmrKcal,
      tdeeKcal,
      targetKcal,
      carbPct: cmd.carbPct,
      proteinPct: cmd.proteinPct,
      fatPct: cmd.fatPct,
      proteinGPerKg,
      notes: clean(cmd.notes),
      createdAt: new Date(),
    };
    return Result.ok(
      withMacros(await this.nutrition.createEnergyCalculation(calculation)),
    );
  }

  async listEnergyCalculations(
    clinicId: string,
    patientId: string,
  ): Promise<Result<EnergyCalculationDetail[], Failure>> {
    const patient = await this.findPatient(clinicId, patientId);
    if (!patient)
      return Result.error(new NotFoundFailure("Paciente", patientId));
    const rows = await this.nutrition.listEnergyCalculationsByPatient(
      clinicId,
      patientId,
    );
    return Result.ok(rows.map(withMacros));
  }

  // ---------- Foods ----------

  async searchFoods(
    query: SearchFoodsQuery,
  ): Promise<Result<FoodItemWithMeasures[], Failure>> {
    const limit = Math.min(
      Math.max(Math.trunc(query.limit ?? DEFAULT_FOOD_SEARCH_LIMIT), 1),
      MAX_FOOD_SEARCH_LIMIT,
    );
    return Result.ok(
      await this.nutrition.searchFoods(
        query.clinicId,
        query.query?.trim() ?? "",
        limit,
      ),
    );
  }

  async createCustomFood(
    cmd: CreateCustomFoodCommand,
  ): Promise<Result<FoodItemWithMeasures, Failure>> {
    if (!cmd.name?.trim()) {
      return Result.error(
        new ValidationFailure("Nome do alimento é obrigatório."),
      );
    }
    const values = [
      cmd.kcalPer100g,
      cmd.carbsPer100g,
      cmd.proteinPer100g,
      cmd.fatPer100g,
      cmd.fiberPer100g ?? 0,
    ];
    if (values.some((v) => !isFiniteNumber(v) || v < 0)) {
      return Result.error(
        new ValidationFailure(
          "Valores nutricionais devem ser números não negativos.",
        ),
      );
    }

    const labels = new Set<string>();
    const foodId = this.ids.generate();
    const measures: FoodMeasure[] = [];
    for (const m of cmd.measures ?? []) {
      const label = m.label?.trim();
      if (!label || !isFiniteNumber(m.grams) || m.grams <= 0) {
        return Result.error(new ValidationFailure("Medida caseira inválida."));
      }
      if (labels.has(label.toLowerCase())) {
        return Result.error(
          new ValidationFailure(`Medida duplicada: ${label}.`),
        );
      }
      labels.add(label.toLowerCase());
      measures.push({
        id: this.ids.generate(),
        foodItemId: foodId,
        label,
        grams: m.grams,
      });
    }

    const food: FoodItem = {
      id: foodId,
      clinicId: cmd.clinicId,
      source: FoodSource.CUSTOM,
      sourceCode: null,
      name: cmd.name.trim(),
      category: clean(cmd.category),
      kcalPer100g: cmd.kcalPer100g,
      carbsPer100g: cmd.carbsPer100g,
      proteinPer100g: cmd.proteinPer100g,
      fatPer100g: cmd.fatPer100g,
      fiberPer100g: cmd.fiberPer100g ?? null,
      active: true,
      createdAt: new Date(),
    };
    return Result.ok(await this.nutrition.createFood(food, measures));
  }

  // ---------- Meal plans ----------

  async createMealPlan(
    cmd: CreateMealPlanCommand,
  ): Promise<Result<MealPlanDetail, Failure>> {
    if (!cmd.title?.trim()) {
      return Result.error(
        new ValidationFailure("Título do plano alimentar é obrigatório."),
      );
    }
    const patient = await this.findPatient(cmd.clinicId, cmd.patientId);
    if (!patient)
      return Result.error(new NotFoundFailure("Paciente", cmd.patientId));

    const mode = cmd.mode ?? MealPlanMode.QUANTITATIVE;
    const mealInputs = cmd.meals ?? [];

    // Load every referenced food at once
    const foodIds = new Set<string>();
    for (const meal of mealInputs) {
      for (const item of meal.items ?? []) {
        if (item.foodItemId) foodIds.add(item.foodItemId);
        for (const sub of item.substitutions ?? []) {
          if (sub.substituteFoodItemId) foodIds.add(sub.substituteFoodItemId);
        }
      }
    }
    const foods = foodIds.size
      ? await this.nutrition.findFoodsByIds(cmd.clinicId, [...foodIds])
      : [];
    const foodMap = new Map(foods.map((f) => [f.id, f]));
    for (const id of foodIds) {
      if (!foodMap.has(id))
        return Result.error(new NotFoundFailure("Alimento", id));
    }

    const planId = this.ids.generate();
    const meals: Meal[] = [];
    for (const [mealIndex, mealInput] of mealInputs.entries()) {
      if (!mealInput.name?.trim()) {
        return Result.error(
          new ValidationFailure("Nome da refeição é obrigatório."),
        );
      }
      const mealId = this.ids.generate();
      const items: MealItem[] = [];
      for (const [itemIndex, itemInput] of (mealInput.items ?? []).entries()) {
        const itemId = this.ids.generate();
        const built = this.buildItem(itemInput, mode, foodMap);
        if (built.isErr) return Result.error(built.error);
        const substitutions: MealSubstitution[] = [];
        for (const subInput of itemInput.substitutions ?? []) {
          const sub = this.buildSubstitution(subInput, mode, foodMap, itemId);
          if (sub.isErr) return Result.error(sub.error);
          substitutions.push(sub.value);
        }
        items.push({
          id: itemId,
          mealId,
          ...built.value,
          sortOrder: itemIndex,
          substitutions,
        });
      }
      meals.push({
        id: mealId,
        mealPlanId: planId,
        name: mealInput.name.trim(),
        scheduledTime: clean(mealInput.scheduledTime),
        sortOrder: mealIndex,
        notes: clean(mealInput.notes),
        items,
      });
    }

    const now = new Date();
    const plan: MealPlanDetail = {
      id: planId,
      clinicId: cmd.clinicId,
      patientId: cmd.patientId,
      professionalId: cmd.professionalId,
      title: cmd.title.trim(),
      objective: clean(cmd.objective),
      mode,
      status: MealPlanStatus.DRAFT,
      targetKcal: cmd.targetKcal ?? null,
      calculatedTotals: sumMealTotals(meals),
      generalNotes: clean(cmd.generalNotes),
      clonedFromId: null,
      createdAt: now,
      updatedAt: now,
      meals,
    };
    return Result.ok(await this.nutrition.createMealPlan(plan));
  }

  async getMealPlan(
    clinicId: string,
    id: string,
  ): Promise<Result<MealPlanDetail, Failure>> {
    const plan = await this.nutrition.findMealPlan(clinicId, id);
    if (!plan) return Result.error(new NotFoundFailure("Plano alimentar", id));
    return Result.ok(plan);
  }

  async listMealPlans(
    clinicId: string,
    patientId?: string,
    status?: MealPlanStatus,
  ): Promise<Result<MealPlan[], Failure>> {
    if (patientId) {
      const patient = await this.findPatient(clinicId, patientId);
      if (!patient)
        return Result.error(new NotFoundFailure("Paciente", patientId));
    }
    return Result.ok(
      await this.nutrition.listMealPlans(clinicId, patientId, status),
    );
  }

  async activateMealPlan(
    clinicId: string,
    id: string,
  ): Promise<Result<MealPlanDetail, Failure>> {
    const plan = await this.nutrition.findMealPlan(clinicId, id);
    if (!plan) return Result.error(new NotFoundFailure("Plano alimentar", id));
    if (plan.status !== MealPlanStatus.ACTIVE) {
      await this.nutrition.activateMealPlan(clinicId, plan.patientId, plan.id);
    }
    const updated = await this.nutrition.findMealPlan(clinicId, id);
    if (!updated)
      return Result.error(new NotFoundFailure("Plano alimentar", id));
    return Result.ok(updated);
  }

  async cloneMealPlan(
    cmd: CloneMealPlanCommand,
  ): Promise<Result<MealPlanDetail, Failure>> {
    const source = await this.nutrition.findMealPlan(
      cmd.clinicId,
      cmd.mealPlanId,
    );
    if (!source)
      return Result.error(
        new NotFoundFailure("Plano alimentar", cmd.mealPlanId),
      );

    const patientId = cmd.patientId ?? source.patientId;
    if (patientId !== source.patientId) {
      const patient: Patient | null = await this.findPatient(
        cmd.clinicId,
        patientId,
      );
      if (!patient)
        return Result.error(new NotFoundFailure("Paciente", patientId));
    }

    const planId = this.ids.generate();
    const meals: Meal[] = source.meals.map((meal) => {
      const mealId = this.ids.generate();
      return {
        ...meal,
        id: mealId,
        mealPlanId: planId,
        items: meal.items.map((item) => {
          const itemId = this.ids.generate();
          return {
            ...item,
            id: itemId,
            mealId,
            nutrientsSnapshot: { ...item.nutrientsSnapshot },
            substitutions: item.substitutions.map((sub) => ({
              ...sub,
              id: this.ids.generate(),
              mealItemId: itemId,
            })),
          };
        }),
      };
    });

    const now = new Date();
    const plan: MealPlanDetail = {
      ...source,
      id: planId,
      patientId,
      professionalId: cmd.professionalId,
      title: cmd.title?.trim() || `${source.title} (cópia)`,
      status: MealPlanStatus.DRAFT,
      calculatedTotals: sumMealTotals(meals),
      clonedFromId: source.id,
      createdAt: now,
      updatedAt: now,
      meals,
    };
    return Result.ok(await this.nutrition.createMealPlan(plan));
  }

  async recalcMealPlan(
    clinicId: string,
    id: string,
  ): Promise<Result<MealPlanDetail, Failure>> {
    const plan = await this.nutrition.findMealPlan(clinicId, id);
    if (!plan) return Result.error(new NotFoundFailure("Plano alimentar", id));
    const totals = sumMealTotals(plan.meals);
    await this.nutrition.updateMealPlanTotals(plan.id, totals);
    return Result.ok({ ...plan, calculatedTotals: totals });
  }

  // ---------- Evolutions ----------

  async createEvolution(
    cmd: CreateNutritionEvolutionCommand,
  ): Promise<Result<NutritionEvolution, Failure>> {
    const patient = await this.findPatient(cmd.clinicId, cmd.patientId);
    if (!patient)
      return Result.error(new NotFoundFailure("Paciente", cmd.patientId));

    const assessment = clean(cmd.assessment);
    const nutritionDiagnosis = clean(cmd.nutritionDiagnosis);
    const intervention = clean(cmd.intervention);
    const monitoringEvaluation = clean(cmd.monitoringEvaluation);
    if (
      !assessment &&
      !nutritionDiagnosis &&
      !intervention &&
      !monitoringEvaluation
    ) {
      return Result.error(
        new ValidationFailure(
          "Preencha ao menos um campo da evolução nutricional.",
        ),
      );
    }

    const now = new Date();
    const evolution: NutritionEvolution = {
      id: this.ids.generate(),
      clinicId: cmd.clinicId,
      patientId: cmd.patientId,
      professionalId: cmd.professionalId,
      format: cmd.format ?? NutritionEvolutionFormat.ADIME,
      assessment,
      nutritionDiagnosis,
      intervention,
      monitoringEvaluation,
      createdAt: now,
      updatedAt: now,
    };
    return Result.ok(await this.nutrition.createEvolution(evolution));
  }

  async listEvolutions(
    clinicId: string,
    patientId: string,
  ): Promise<Result<NutritionEvolution[], Failure>> {
    const patient = await this.findPatient(clinicId, patientId);
    if (!patient)
      return Result.error(new NotFoundFailure("Paciente", patientId));
    return Result.ok(
      await this.nutrition.listEvolutionsByPatient(clinicId, patientId),
    );
  }

  // ---------- Goals ----------

  async createGoal(
    cmd: CreatePatientGoalCommand,
  ): Promise<Result<PatientGoal, Failure>> {
    if (!cmd.title?.trim()) {
      return Result.error(
        new ValidationFailure("Título da meta é obrigatório."),
      );
    }
    if (!cmd.metricType?.trim()) {
      return Result.error(
        new ValidationFailure("Tipo de métrica é obrigatório."),
      );
    }
    const patient = await this.findPatient(cmd.clinicId, cmd.patientId);
    if (!patient)
      return Result.error(new NotFoundFailure("Paciente", cmd.patientId));

    const now = new Date();
    const goal: PatientGoal = {
      id: this.ids.generate(),
      clinicId: cmd.clinicId,
      patientId: cmd.patientId,
      professionalId: cmd.professionalId,
      title: cmd.title.trim(),
      metricType: cmd.metricType.trim(),
      targetValue: clean(cmd.targetValue),
      currentValue: clean(cmd.currentValue),
      dueDate: cmd.dueDate ?? null,
      status: cmd.status?.trim() || "OPEN",
      createdAt: now,
      updatedAt: now,
    };
    return Result.ok(await this.nutrition.createGoal(goal));
  }

  async listGoals(
    clinicId: string,
    patientId: string,
  ): Promise<Result<PatientGoal[], Failure>> {
    const patient = await this.findPatient(clinicId, patientId);
    if (!patient)
      return Result.error(new NotFoundFailure("Paciente", patientId));
    return Result.ok(
      await this.nutrition.listGoalsByPatient(clinicId, patientId),
    );
  }

  // ---------- Helpers ----------

  private async findPatient(
    clinicId: string,
    patientId: string | undefined,
  ): Promise<Patient | null> {
    if (!patientId) return null;
    return this.patients.findById(clinicId, patientId);
  }

  private resolveGrams(
    input: { measureLabel: string; quantity: number; grams?: number },
    food: FoodItemWithMeasures | undefined,
    mode: MealPlanMode,
  ): Result<number, Failure> {
    if (!input.measureLabel?.trim()) {
      return Result.error(
        new ValidationFailure("Medida do item é obrigatória."),
      );
    }
    if (!isFiniteNumber(input.quantity) || input.quantity <= 0) {
      return Result.error(
        new ValidationFailure("Quantidade deve ser maior que zero."),
      );
    }
    if (input.grams != null) {
      if (!isFiniteNumber(input.grams) || input.grams < 0) {
        return Result.error(new ValidationFailure("Gramas inválidas."));
      }
      return Result.ok(input.grams);
    }
    const label = input.measureLabel.trim().toLowerCase();
    const measure = food?.measures.find(
      (m) => m.label.trim().toLowerCase() === label,
    );
    if (measure) return Result.ok(round(input.quantity * measure.grams));
    if (GRAM_LABELS.has(label)) return Result.ok(input.quantity);
    if (mode === MealPlanMode.QUALITATIVE) return Result.ok(0);
    return Result.error(
      new ValidationFailure(
        `Não foi possível determinar as gramas da medida "${input.measureLabel}".`,
      ),
    );
  }

  private buildItem(
    input: MealItemInput,
    mode: MealPlanMode,
    foodMap: Map<string, FoodItemWithMeasures>,
  ): Result<
    Pick<
      MealItem,
      | "foodItemId"
      | "customLabel"
      | "measureLabel"
      | "quantity"
      | "grams"
      | "nutrientsSnapshot"
    >,
    Failure
  > {
    const food = input.foodItemId ? foodMap.get(input.foodItemId) : undefined;
    if (!food && !input.customLabel?.trim()) {
      return Result.error(
        new ValidationFailure(
          "Informe um alimento ou uma descrição livre para o item.",
        ),
      );
    }
    const grams = this.resolveGrams(input, food, mode);
    if (grams.isErr) return Result.error(grams.error);

    const nutrientsSnapshot: NutrientSnapshot = food
      ? scaleNutrients(food, grams.value)
      : {
          kcal: round(input.nutrients?.kcal ?? 0),
          carbs: round(input.nutrients?.carbs ?? 0),
          protein: round(input.nutrients?.protein ?? 0),
          fat: round(input.nutrients?.fat ?? 0),
          fiber: round(input.nutrients?.fiber ?? 0),
        };

    return Result.ok({
      foodItemId: food?.id ?? null,
      customLabel: clean(input.customLabel),
      measureLabel: input.measureLabel.trim(),
      quantity: input.quantity,
      grams: grams.value,
      nutrientsSnapshot,
    });
  }

  private buildSubstitution(
    input: {
      substituteFoodItemId?: string | null;
      measureLabel: string;
      quantity: number;
      grams?: number;
      notes?: string | null;
    },
    mode: MealPlanMode,
    foodMap: Map<string, FoodItemWithMeasures>,
    mealItemId: string,
  ): Result<MealSubstitution, Failure> {
    const food = input.substituteFoodItemId
      ? foodMap.get(input.substituteFoodItemId)
      : undefined;
    const grams = this.resolveGrams(input, food, mode);
    if (grams.isErr) return Result.error(grams.error);
    return Result.ok({
      id: this.ids.generate(),
      mealItemId,
      substituteFoodItemId: food?.id ?? null,
      measureLabel: input.measureLabel.trim(),
      quantity: input.quantity,
      grams: grams.value,
      notes: clean(input.notes),
    });
  }
}
