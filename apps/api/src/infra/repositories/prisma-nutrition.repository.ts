import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type {
  AnthropometricAssessment,
  EnergyCalculation,
  FoodItem,
  FoodItemWithMeasures,
  FoodMeasure,
  Meal,
  MealItem,
  MealPlan,
  MealPlanDetail,
  MealPlanStatus,
  MealPlanTotals,
  MealSubstitution,
  NutrientSnapshot,
  NutritionAnamnesis,
  NutritionEvolution,
  PatientGoal,
} from "../../domain/entities";
import { MealPlanStatus as MealPlanStatusEnum } from "../../domain/entities";
import type { NutritionRepository } from "../../domain/ports/output";
import { PrismaService } from "../database/prisma.service";

type DecimalLike = { toString(): string } | number;
type JsonRecord = Record<string, unknown>;

function num(value: DecimalLike): number {
  return Number(value);
}

function numOrNull(value: DecimalLike | null | undefined): number | null {
  return value == null ? null : Number(value);
}

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as JsonRecord;
}

function asSnapshot(value: unknown): NutrientSnapshot {
  const v = (asRecord(value) ?? {}) as Partial<
    Record<keyof NutrientSnapshot, unknown>
  >;
  return {
    kcal: Number(v.kcal ?? 0),
    carbs: Number(v.carbs ?? 0),
    protein: Number(v.protein ?? 0),
    fat: Number(v.fat ?? 0),
    fiber: Number(v.fiber ?? 0),
  };
}

function toJson(
  value: JsonRecord | null | undefined,
): Prisma.InputJsonValue | undefined {
  return (value ?? undefined) as Prisma.InputJsonValue | undefined;
}

// ---------- Mappers ----------

function mapAnamnesis(row: {
  id: string;
  clinicId: string;
  patientId: string;
  professionalId: string;
  responses: unknown;
  recordedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}): NutritionAnamnesis {
  return {
    id: row.id,
    clinicId: row.clinicId,
    patientId: row.patientId,
    professionalId: row.professionalId,
    responses: asRecord(row.responses) ?? {},
    recordedAt: row.recordedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapAssessment(row: {
  id: string;
  clinicId: string;
  patientId: string;
  professionalId: string;
  measuredAt: Date;
  weightKg: DecimalLike;
  heightCm: DecimalLike;
  bmi: DecimalLike | null;
  circumferences: unknown;
  skinfolds: unknown;
  bodyFatProtocol: string | null;
  bodyFatPct: DecimalLike | null;
  leanMassKg: DecimalLike | null;
  fatMassKg: DecimalLike | null;
  bioimpedance: unknown;
  notes: string | null;
  createdAt: Date;
}): AnthropometricAssessment {
  return {
    id: row.id,
    clinicId: row.clinicId,
    patientId: row.patientId,
    professionalId: row.professionalId,
    measuredAt: row.measuredAt,
    weightKg: num(row.weightKg),
    heightCm: num(row.heightCm),
    bmi: numOrNull(row.bmi),
    circumferences: asRecord(row.circumferences),
    skinfolds: asRecord(row.skinfolds),
    bodyFatProtocol: row.bodyFatProtocol,
    bodyFatPct: numOrNull(row.bodyFatPct),
    leanMassKg: numOrNull(row.leanMassKg),
    fatMassKg: numOrNull(row.fatMassKg),
    bioimpedance: asRecord(row.bioimpedance),
    notes: row.notes,
    createdAt: row.createdAt,
  };
}

function mapEnergyCalculation(row: {
  id: string;
  clinicId: string;
  patientId: string;
  professionalId: string;
  assessmentId: string | null;
  formula: string;
  activityFactor: DecimalLike;
  bmrKcal: number;
  tdeeKcal: number;
  targetKcal: number;
  carbPct: DecimalLike;
  proteinPct: DecimalLike;
  fatPct: DecimalLike;
  proteinGPerKg: DecimalLike | null;
  notes: string | null;
  createdAt: Date;
}): EnergyCalculation {
  return {
    id: row.id,
    clinicId: row.clinicId,
    patientId: row.patientId,
    professionalId: row.professionalId,
    assessmentId: row.assessmentId,
    formula: row.formula as EnergyCalculation["formula"],
    activityFactor: num(row.activityFactor),
    bmrKcal: row.bmrKcal,
    tdeeKcal: row.tdeeKcal,
    targetKcal: row.targetKcal,
    carbPct: num(row.carbPct),
    proteinPct: num(row.proteinPct),
    fatPct: num(row.fatPct),
    proteinGPerKg: numOrNull(row.proteinGPerKg),
    notes: row.notes,
    createdAt: row.createdAt,
  };
}

function mapFoodMeasure(row: {
  id: string;
  foodItemId: string;
  label: string;
  grams: DecimalLike;
}): FoodMeasure {
  return {
    id: row.id,
    foodItemId: row.foodItemId,
    label: row.label,
    grams: num(row.grams),
  };
}

function mapFoodItem(row: {
  id: string;
  clinicId: string | null;
  source: string;
  sourceCode: string | null;
  name: string;
  category: string | null;
  kcalPer100g: DecimalLike;
  carbsPer100g: DecimalLike;
  proteinPer100g: DecimalLike;
  fatPer100g: DecimalLike;
  fiberPer100g: DecimalLike | null;
  active: boolean;
  createdAt: Date;
}): FoodItem {
  return {
    id: row.id,
    clinicId: row.clinicId,
    source: row.source as FoodItem["source"],
    sourceCode: row.sourceCode,
    name: row.name,
    category: row.category,
    kcalPer100g: num(row.kcalPer100g),
    carbsPer100g: num(row.carbsPer100g),
    proteinPer100g: num(row.proteinPer100g),
    fatPer100g: num(row.fatPer100g),
    fiberPer100g: numOrNull(row.fiberPer100g),
    active: row.active,
    createdAt: row.createdAt,
  };
}

function mapFoodWithMeasures(
  row: Parameters<typeof mapFoodItem>[0] & {
    measures: Array<Parameters<typeof mapFoodMeasure>[0]>;
  },
): FoodItemWithMeasures {
  return {
    ...mapFoodItem(row),
    measures: row.measures.map(mapFoodMeasure),
  };
}

function mapSubstitution(row: {
  id: string;
  mealItemId: string;
  substituteFoodItemId: string | null;
  measureLabel: string;
  quantity: DecimalLike;
  grams: DecimalLike;
  notes: string | null;
}): MealSubstitution {
  return {
    id: row.id,
    mealItemId: row.mealItemId,
    substituteFoodItemId: row.substituteFoodItemId,
    measureLabel: row.measureLabel,
    quantity: num(row.quantity),
    grams: num(row.grams),
    notes: row.notes,
  };
}

function mapMealItem(row: {
  id: string;
  mealId: string;
  foodItemId: string | null;
  customLabel: string | null;
  measureLabel: string;
  quantity: DecimalLike;
  grams: DecimalLike;
  nutrientsSnapshot: unknown;
  sortOrder: number;
  substitutions: Array<Parameters<typeof mapSubstitution>[0]>;
}): MealItem {
  return {
    id: row.id,
    mealId: row.mealId,
    foodItemId: row.foodItemId,
    customLabel: row.customLabel,
    measureLabel: row.measureLabel,
    quantity: num(row.quantity),
    grams: num(row.grams),
    nutrientsSnapshot: asSnapshot(row.nutrientsSnapshot),
    sortOrder: row.sortOrder,
    substitutions: row.substitutions.map(mapSubstitution),
  };
}

function mapMeal(row: {
  id: string;
  mealPlanId: string;
  name: string;
  scheduledTime: string | null;
  sortOrder: number;
  notes: string | null;
  items: Array<Parameters<typeof mapMealItem>[0]>;
}): Meal {
  return {
    id: row.id,
    mealPlanId: row.mealPlanId,
    name: row.name,
    scheduledTime: row.scheduledTime,
    sortOrder: row.sortOrder,
    notes: row.notes,
    items: [...row.items]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(mapMealItem),
  };
}

function mapMealPlan(row: {
  id: string;
  clinicId: string;
  patientId: string;
  professionalId: string;
  title: string;
  objective: string | null;
  mode: string;
  status: string;
  targetKcal: number | null;
  calculatedTotals: unknown;
  generalNotes: string | null;
  clonedFromId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): MealPlan {
  const totals = asRecord(row.calculatedTotals);
  return {
    id: row.id,
    clinicId: row.clinicId,
    patientId: row.patientId,
    professionalId: row.professionalId,
    title: row.title,
    objective: row.objective,
    mode: row.mode as MealPlan["mode"],
    status: row.status as MealPlan["status"],
    targetKcal: row.targetKcal,
    calculatedTotals: totals ? asSnapshot(totals) : null,
    generalNotes: row.generalNotes,
    clonedFromId: row.clonedFromId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapMealPlanDetail(
  row: Parameters<typeof mapMealPlan>[0] & {
    meals: Array<Parameters<typeof mapMeal>[0]>;
  },
): MealPlanDetail {
  return {
    ...mapMealPlan(row),
    meals: [...row.meals]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(mapMeal),
  };
}

function mapEvolution(row: {
  id: string;
  clinicId: string;
  patientId: string;
  professionalId: string;
  format: string;
  assessment: string | null;
  nutritionDiagnosis: string | null;
  intervention: string | null;
  monitoringEvaluation: string | null;
  createdAt: Date;
  updatedAt: Date;
}): NutritionEvolution {
  return {
    id: row.id,
    clinicId: row.clinicId,
    patientId: row.patientId,
    professionalId: row.professionalId,
    format: row.format as NutritionEvolution["format"],
    assessment: row.assessment,
    nutritionDiagnosis: row.nutritionDiagnosis,
    intervention: row.intervention,
    monitoringEvaluation: row.monitoringEvaluation,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapGoal(row: {
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
}): PatientGoal {
  return {
    id: row.id,
    clinicId: row.clinicId,
    patientId: row.patientId,
    professionalId: row.professionalId,
    title: row.title,
    metricType: row.metricType,
    targetValue: row.targetValue,
    currentValue: row.currentValue,
    dueDate: row.dueDate,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const mealPlanInclude = {
  meals: {
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        include: { substitutions: true },
      },
    },
  },
} as const;

@Injectable()
export class PrismaNutritionRepository implements NutritionRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Anamnesis ----------

  async createAnamnesis(
    anamnesis: NutritionAnamnesis,
  ): Promise<NutritionAnamnesis> {
    const row = await this.prisma.nutritionAnamnesis.create({
      data: {
        id: anamnesis.id,
        clinicId: anamnesis.clinicId,
        patientId: anamnesis.patientId,
        professionalId: anamnesis.professionalId,
        responses: anamnesis.responses as Prisma.InputJsonValue,
        recordedAt: anamnesis.recordedAt,
        createdAt: anamnesis.createdAt,
        updatedAt: anamnesis.updatedAt,
      },
    });
    return mapAnamnesis(row);
  }

  async listAnamnesesByPatient(
    clinicId: string,
    patientId: string,
  ): Promise<NutritionAnamnesis[]> {
    const rows = await this.prisma.nutritionAnamnesis.findMany({
      where: { clinicId, patientId },
      orderBy: { recordedAt: "desc" },
    });
    return rows.map(mapAnamnesis);
  }

  // ---------- Anthropometry ----------

  async createAssessment(
    assessment: AnthropometricAssessment,
  ): Promise<AnthropometricAssessment> {
    const row = await this.prisma.anthropometricAssessment.create({
      data: {
        id: assessment.id,
        clinicId: assessment.clinicId,
        patientId: assessment.patientId,
        professionalId: assessment.professionalId,
        measuredAt: assessment.measuredAt,
        weightKg: assessment.weightKg,
        heightCm: assessment.heightCm,
        bmi: assessment.bmi,
        circumferences: toJson(assessment.circumferences),
        skinfolds: toJson(assessment.skinfolds),
        bodyFatProtocol: assessment.bodyFatProtocol,
        bodyFatPct: assessment.bodyFatPct,
        leanMassKg: assessment.leanMassKg,
        fatMassKg: assessment.fatMassKg,
        bioimpedance: toJson(assessment.bioimpedance),
        notes: assessment.notes,
        createdAt: assessment.createdAt,
      },
    });
    return mapAssessment(row);
  }

  async findAssessment(
    clinicId: string,
    id: string,
  ): Promise<AnthropometricAssessment | null> {
    const row = await this.prisma.anthropometricAssessment.findFirst({
      where: { id, clinicId },
    });
    return row ? mapAssessment(row) : null;
  }

  async findLatestAssessment(
    clinicId: string,
    patientId: string,
  ): Promise<AnthropometricAssessment | null> {
    const row = await this.prisma.anthropometricAssessment.findFirst({
      where: { clinicId, patientId },
      orderBy: { measuredAt: "desc" },
    });
    return row ? mapAssessment(row) : null;
  }

  async listAssessmentsByPatient(
    clinicId: string,
    patientId: string,
  ): Promise<AnthropometricAssessment[]> {
    const rows = await this.prisma.anthropometricAssessment.findMany({
      where: { clinicId, patientId },
      orderBy: { measuredAt: "desc" },
    });
    return rows.map(mapAssessment);
  }

  // ---------- Energy ----------

  async createEnergyCalculation(
    calculation: EnergyCalculation,
  ): Promise<EnergyCalculation> {
    const row = await this.prisma.energyCalculation.create({
      data: {
        id: calculation.id,
        clinicId: calculation.clinicId,
        patientId: calculation.patientId,
        professionalId: calculation.professionalId,
        assessmentId: calculation.assessmentId,
        formula: calculation.formula,
        activityFactor: calculation.activityFactor,
        bmrKcal: calculation.bmrKcal,
        tdeeKcal: calculation.tdeeKcal,
        targetKcal: calculation.targetKcal,
        carbPct: calculation.carbPct,
        proteinPct: calculation.proteinPct,
        fatPct: calculation.fatPct,
        proteinGPerKg: calculation.proteinGPerKg,
        notes: calculation.notes,
        createdAt: calculation.createdAt,
      },
    });
    return mapEnergyCalculation(row);
  }

  async listEnergyCalculationsByPatient(
    clinicId: string,
    patientId: string,
  ): Promise<EnergyCalculation[]> {
    const rows = await this.prisma.energyCalculation.findMany({
      where: { clinicId, patientId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapEnergyCalculation);
  }

  // ---------- Foods ----------

  async searchFoods(
    clinicId: string,
    query: string,
    limit: number,
  ): Promise<FoodItemWithMeasures[]> {
    const rows = await this.prisma.foodItem.findMany({
      where: {
        active: true,
        OR: [{ clinicId: null }, { clinicId }],
        ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
      },
      include: { measures: { orderBy: { label: "asc" } } },
      orderBy: { name: "asc" },
      take: limit,
    });
    return rows.map(mapFoodWithMeasures);
  }

  async findFoodsByIds(
    clinicId: string,
    ids: string[],
  ): Promise<FoodItemWithMeasures[]> {
    if (!ids.length) return [];
    const rows = await this.prisma.foodItem.findMany({
      where: {
        id: { in: ids },
        OR: [{ clinicId: null }, { clinicId }],
      },
      include: { measures: true },
    });
    return rows.map(mapFoodWithMeasures);
  }

  async createFood(
    food: FoodItem,
    measures: FoodMeasure[],
  ): Promise<FoodItemWithMeasures> {
    const row = await this.prisma.foodItem.create({
      data: {
        id: food.id,
        clinicId: food.clinicId,
        source: food.source,
        sourceCode: food.sourceCode,
        name: food.name,
        category: food.category,
        kcalPer100g: food.kcalPer100g,
        carbsPer100g: food.carbsPer100g,
        proteinPer100g: food.proteinPer100g,
        fatPer100g: food.fatPer100g,
        fiberPer100g: food.fiberPer100g,
        active: food.active,
        createdAt: food.createdAt,
        measures: {
          create: measures.map((m) => ({
            id: m.id,
            label: m.label,
            grams: m.grams,
          })),
        },
      },
      include: { measures: { orderBy: { label: "asc" } } },
    });
    return mapFoodWithMeasures(row);
  }

  // ---------- Meal plans ----------

  async createMealPlan(plan: MealPlanDetail): Promise<MealPlanDetail> {
    const row = await this.prisma.mealPlan.create({
      data: {
        id: plan.id,
        clinicId: plan.clinicId,
        patientId: plan.patientId,
        professionalId: plan.professionalId,
        title: plan.title,
        objective: plan.objective,
        mode: plan.mode,
        status: plan.status,
        targetKcal: plan.targetKcal,
        calculatedTotals: (plan.calculatedTotals ?? undefined) as
          Prisma.InputJsonValue | undefined,
        generalNotes: plan.generalNotes,
        clonedFromId: plan.clonedFromId,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
        meals: {
          create: plan.meals.map((meal) => ({
            id: meal.id,
            name: meal.name,
            scheduledTime: meal.scheduledTime,
            sortOrder: meal.sortOrder,
            notes: meal.notes,
            items: {
              create: meal.items.map((item) => ({
                id: item.id,
                foodItemId: item.foodItemId,
                customLabel: item.customLabel,
                measureLabel: item.measureLabel,
                quantity: item.quantity,
                grams: item.grams,
                nutrientsSnapshot:
                  item.nutrientsSnapshot as unknown as Prisma.InputJsonValue,
                sortOrder: item.sortOrder,
                substitutions: {
                  create: item.substitutions.map((sub) => ({
                    id: sub.id,
                    substituteFoodItemId: sub.substituteFoodItemId,
                    measureLabel: sub.measureLabel,
                    quantity: sub.quantity,
                    grams: sub.grams,
                    notes: sub.notes,
                  })),
                },
              })),
            },
          })),
        },
      },
      include: mealPlanInclude,
    });
    return mapMealPlanDetail(row);
  }

  async findMealPlan(
    clinicId: string,
    id: string,
  ): Promise<MealPlanDetail | null> {
    const row = await this.prisma.mealPlan.findFirst({
      where: { id, clinicId },
      include: mealPlanInclude,
    });
    return row ? mapMealPlanDetail(row) : null;
  }

  async listMealPlans(
    clinicId: string,
    patientId?: string,
    status?: MealPlanStatus,
  ): Promise<MealPlan[]> {
    const rows = await this.prisma.mealPlan.findMany({
      where: {
        clinicId,
        ...(patientId ? { patientId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapMealPlan);
  }

  async updateMealPlanTotals(
    planId: string,
    totals: MealPlanTotals,
  ): Promise<void> {
    await this.prisma.mealPlan.update({
      where: { id: planId },
      data: { calculatedTotals: totals as unknown as Prisma.InputJsonValue },
    });
  }

  async activateMealPlan(
    clinicId: string,
    patientId: string,
    planId: string,
  ): Promise<MealPlan> {
    const [, row] = await this.prisma.$transaction([
      this.prisma.mealPlan.updateMany({
        where: {
          clinicId,
          patientId,
          status: MealPlanStatusEnum.ACTIVE,
          id: { not: planId },
        },
        data: { status: MealPlanStatusEnum.ARCHIVED },
      }),
      this.prisma.mealPlan.update({
        where: { id: planId },
        data: { status: MealPlanStatusEnum.ACTIVE },
      }),
    ]);
    return mapMealPlan(row);
  }

  // ---------- Evolutions ----------

  async createEvolution(
    evolution: NutritionEvolution,
  ): Promise<NutritionEvolution> {
    const row = await this.prisma.nutritionEvolution.create({
      data: {
        id: evolution.id,
        clinicId: evolution.clinicId,
        patientId: evolution.patientId,
        professionalId: evolution.professionalId,
        format: evolution.format,
        assessment: evolution.assessment,
        nutritionDiagnosis: evolution.nutritionDiagnosis,
        intervention: evolution.intervention,
        monitoringEvaluation: evolution.monitoringEvaluation,
        createdAt: evolution.createdAt,
        updatedAt: evolution.updatedAt,
      },
    });
    return mapEvolution(row);
  }

  async listEvolutionsByPatient(
    clinicId: string,
    patientId: string,
  ): Promise<NutritionEvolution[]> {
    const rows = await this.prisma.nutritionEvolution.findMany({
      where: { clinicId, patientId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapEvolution);
  }

  // ---------- Goals ----------

  async createGoal(goal: PatientGoal): Promise<PatientGoal> {
    const row = await this.prisma.patientGoal.create({
      data: {
        id: goal.id,
        clinicId: goal.clinicId,
        patientId: goal.patientId,
        professionalId: goal.professionalId,
        title: goal.title,
        metricType: goal.metricType,
        targetValue: goal.targetValue,
        currentValue: goal.currentValue,
        dueDate: goal.dueDate,
        status: goal.status,
        createdAt: goal.createdAt,
        updatedAt: goal.updatedAt,
      },
    });
    return mapGoal(row);
  }

  async listGoalsByPatient(
    clinicId: string,
    patientId: string,
  ): Promise<PatientGoal[]> {
    const rows = await this.prisma.patientGoal.findMany({
      where: { clinicId, patientId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapGoal);
  }
}
