import {
  Body,
  Controller,
  Get,
  HttpException,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import {
  NUTRITION_USE_CASE,
  type NutritionUseCase,
} from "../../../domain/ports/input";
import {
  BiologicalSex,
  EnergyFormula,
  MealPlanMode,
  MealPlanStatus,
  NutritionEvolutionFormat,
} from "../../../domain/entities";
import { httpStatusFor } from "../failure-http.mapper";
import {
  AuthenticatedRequest,
  JwtAuthGuard,
} from "../../guards/jwt-auth.guard";

class CreateAnamnesisDto {
  @IsUUID()
  patientId!: string;

  @IsObject()
  responses!: Record<string, unknown>;

  @IsOptional()
  @IsDateString()
  recordedAt?: string;
}

class CreateAnthropometryDto {
  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsDateString()
  measuredAt?: string;

  @IsNumber()
  @Min(0.1)
  weightKg!: number;

  @IsNumber()
  @Min(1)
  heightCm!: number;

  @IsOptional()
  @IsObject()
  circumferences?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  skinfolds?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  bodyFatProtocol?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  bodyFatPct?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  leanMassKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fatMassKg?: number;

  @IsOptional()
  @IsObject()
  bioimpedance?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  notes?: string;
}

class CreateEnergyDto {
  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsUUID()
  assessmentId?: string;

  @IsEnum(EnergyFormula)
  formula!: EnergyFormula;

  @IsNumber()
  @Min(1)
  @Max(3)
  activityFactor!: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  weightKg?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  heightCm?: number;

  @IsOptional()
  @IsEnum(BiologicalSex)
  sex?: BiologicalSex;

  @IsOptional()
  @IsNumber()
  @Min(1)
  customBmrKcal?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  targetKcal?: number;

  @IsOptional()
  @IsNumber()
  kcalAdjustment?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  carbPct!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  proteinPct!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  fatPct!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  proteinGPerKg?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

class FoodMeasureDto {
  @IsString()
  @MinLength(1)
  label!: string;

  @IsNumber()
  @Min(0.01)
  grams!: number;
}

class CreateFoodDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsNumber()
  @Min(0)
  kcalPer100g!: number;

  @IsNumber()
  @Min(0)
  carbsPer100g!: number;

  @IsNumber()
  @Min(0)
  proteinPer100g!: number;

  @IsNumber()
  @Min(0)
  fatPer100g!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fiberPer100g?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => FoodMeasureDto)
  measures?: FoodMeasureDto[];
}

class NutrientsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  kcal?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  carbs?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  protein?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fat?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fiber?: number;
}

class MealSubstitutionDto {
  @IsOptional()
  @IsUUID()
  substituteFoodItemId?: string;

  @IsString()
  @MinLength(1)
  measureLabel!: string;

  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  grams?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

class MealItemDto {
  @IsOptional()
  @IsUUID()
  foodItemId?: string;

  @IsOptional()
  @IsString()
  customLabel?: string;

  @IsString()
  @MinLength(1)
  measureLabel!: string;

  @IsNumber()
  @Min(0.01)
  quantity!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  grams?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => NutrientsDto)
  nutrients?: NutrientsDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MealSubstitutionDto)
  substitutions?: MealSubstitutionDto[];
}

class MealDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  scheduledTime?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MealItemDto)
  items?: MealItemDto[];
}

class CreateMealPlanDto {
  @IsUUID()
  patientId!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsEnum(MealPlanMode)
  mode?: MealPlanMode;

  @IsOptional()
  @IsInt()
  @Min(0)
  targetKcal?: number;

  @IsOptional()
  @IsString()
  generalNotes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MealDto)
  meals?: MealDto[];
}

class CloneMealPlanDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsUUID()
  patientId?: string;
}

class CreateEvolutionDto {
  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsEnum(NutritionEvolutionFormat)
  format?: NutritionEvolutionFormat;

  @IsOptional()
  @IsString()
  assessment?: string;

  @IsOptional()
  @IsString()
  nutritionDiagnosis?: string;

  @IsOptional()
  @IsString()
  intervention?: string;

  @IsOptional()
  @IsString()
  monitoringEvaluation?: string;
}

class CreateGoalDto {
  @IsUUID()
  patientId!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @MinLength(1)
  metricType!: string;

  @IsOptional()
  @IsString()
  targetValue?: string;

  @IsOptional()
  @IsString()
  currentValue?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsIn(["OPEN", "ACHIEVED", "CANCELLED"])
  status?: string;
}

@Controller("nutrition")
@UseGuards(JwtAuthGuard)
export class NutritionController {
  constructor(
    @Inject(NUTRITION_USE_CASE) private readonly nutrition: NutritionUseCase,
  ) {}

  // ---------- Anamnesis ----------

  @Get("anamneses")
  async listAnamneses(
    @Req() req: AuthenticatedRequest,
    @Query("patientId") patientId: string,
  ) {
    return this.unwrap(
      await this.nutrition.listAnamneses(req.user.clinicId, patientId),
    );
  }

  @Post("anamneses")
  async createAnamnesis(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateAnamnesisDto,
  ) {
    return this.unwrap(
      await this.nutrition.createAnamnesis({
        clinicId: req.user.clinicId,
        professionalId: req.user.sub,
        patientId: body.patientId,
        responses: body.responses,
        recordedAt: body.recordedAt ? new Date(body.recordedAt) : undefined,
      }),
    );
  }

  // ---------- Anthropometry ----------

  @Get("anthropometry")
  async listAnthropometry(
    @Req() req: AuthenticatedRequest,
    @Query("patientId") patientId: string,
  ) {
    return this.unwrap(
      await this.nutrition.listAnthropometry(req.user.clinicId, patientId),
    );
  }

  @Post("anthropometry")
  async createAnthropometry(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateAnthropometryDto,
  ) {
    return this.unwrap(
      await this.nutrition.createAnthropometry({
        clinicId: req.user.clinicId,
        professionalId: req.user.sub,
        patientId: body.patientId,
        measuredAt: body.measuredAt ? new Date(body.measuredAt) : undefined,
        weightKg: body.weightKg,
        heightCm: body.heightCm,
        circumferences: body.circumferences,
        skinfolds: body.skinfolds,
        bodyFatProtocol: body.bodyFatProtocol,
        bodyFatPct: body.bodyFatPct,
        leanMassKg: body.leanMassKg,
        fatMassKg: body.fatMassKg,
        bioimpedance: body.bioimpedance,
        notes: body.notes,
      }),
    );
  }

  // ---------- Energy ----------

  @Get("energy")
  async listEnergy(
    @Req() req: AuthenticatedRequest,
    @Query("patientId") patientId: string,
  ) {
    return this.unwrap(
      await this.nutrition.listEnergyCalculations(req.user.clinicId, patientId),
    );
  }

  @Post("energy")
  async createEnergy(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateEnergyDto,
  ) {
    return this.unwrap(
      await this.nutrition.createEnergyCalculation({
        clinicId: req.user.clinicId,
        professionalId: req.user.sub,
        ...body,
      }),
    );
  }

  // ---------- Foods ----------

  @Get("foods")
  async searchFoods(
    @Req() req: AuthenticatedRequest,
    @Query("q") q?: string,
    @Query("limit") limit?: string,
  ) {
    const parsed = limit ? Number(limit) : undefined;
    return this.unwrap(
      await this.nutrition.searchFoods({
        clinicId: req.user.clinicId,
        query: q ?? "",
        limit:
          parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined,
      }),
    );
  }

  @Post("foods")
  async createFood(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateFoodDto,
  ) {
    return this.unwrap(
      await this.nutrition.createCustomFood({
        clinicId: req.user.clinicId,
        ...body,
      }),
    );
  }

  // ---------- Meal plans ----------

  @Get("meal-plans")
  async listMealPlans(
    @Req() req: AuthenticatedRequest,
    @Query("patientId") patientId?: string,
    @Query("status") status?: MealPlanStatus,
  ) {
    return this.unwrap(
      await this.nutrition.listMealPlans(
        req.user.clinicId,
        patientId || undefined,
        status && Object.values(MealPlanStatus).includes(status)
          ? status
          : undefined,
      ),
    );
  }

  @Get("meal-plans/:id")
  async getMealPlan(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.unwrap(await this.nutrition.getMealPlan(req.user.clinicId, id));
  }

  @Post("meal-plans")
  async createMealPlan(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateMealPlanDto,
  ) {
    return this.unwrap(
      await this.nutrition.createMealPlan({
        clinicId: req.user.clinicId,
        professionalId: req.user.sub,
        patientId: body.patientId,
        title: body.title,
        objective: body.objective,
        mode: body.mode,
        targetKcal: body.targetKcal,
        generalNotes: body.generalNotes,
        meals: body.meals,
      }),
    );
  }

  @Post("meal-plans/:id/activate")
  async activateMealPlan(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    return this.unwrap(
      await this.nutrition.activateMealPlan(req.user.clinicId, id),
    );
  }

  @Post("meal-plans/:id/clone")
  async cloneMealPlan(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() body: CloneMealPlanDto,
  ) {
    return this.unwrap(
      await this.nutrition.cloneMealPlan({
        clinicId: req.user.clinicId,
        professionalId: req.user.sub,
        mealPlanId: id,
        title: body.title,
        patientId: body.patientId,
      }),
    );
  }

  @Post("meal-plans/:id/recalc")
  async recalcMealPlan(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    return this.unwrap(
      await this.nutrition.recalcMealPlan(req.user.clinicId, id),
    );
  }

  // ---------- Evolutions ----------

  @Get("evolutions")
  async listEvolutions(
    @Req() req: AuthenticatedRequest,
    @Query("patientId") patientId: string,
  ) {
    return this.unwrap(
      await this.nutrition.listEvolutions(req.user.clinicId, patientId),
    );
  }

  @Post("evolutions")
  async createEvolution(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateEvolutionDto,
  ) {
    return this.unwrap(
      await this.nutrition.createEvolution({
        clinicId: req.user.clinicId,
        professionalId: req.user.sub,
        ...body,
      }),
    );
  }

  // ---------- Goals ----------

  @Get("goals")
  async listGoals(
    @Req() req: AuthenticatedRequest,
    @Query("patientId") patientId: string,
  ) {
    return this.unwrap(
      await this.nutrition.listGoals(req.user.clinicId, patientId),
    );
  }

  @Post("goals")
  async createGoal(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateGoalDto,
  ) {
    return this.unwrap(
      await this.nutrition.createGoal({
        clinicId: req.user.clinicId,
        professionalId: req.user.sub,
        patientId: body.patientId,
        title: body.title,
        metricType: body.metricType,
        targetValue: body.targetValue,
        currentValue: body.currentValue,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        status: body.status,
      }),
    );
  }

  private unwrap<T>(result: {
    isErr: boolean;
    error?: { message: string };
    value?: T;
  }): T {
    if (result.isErr) {
      throw new HttpException(
        { message: result.error!.message },
        httpStatusFor(result.error as never),
      );
    }
    return result.value as T;
  }
}
