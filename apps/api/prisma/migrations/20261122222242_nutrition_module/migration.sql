-- CreateEnum
CREATE TYPE "Specialty" AS ENUM ('FISIOTERAPIA', 'NUTRICAO');

-- CreateEnum
CREATE TYPE "CouncilType" AS ENUM ('CREFITO', 'CRN', 'OTHER');

-- CreateEnum
CREATE TYPE "BiologicalSex" AS ENUM ('FEMALE', 'MALE', 'UNSPECIFIED');

-- CreateEnum
CREATE TYPE "FoodSource" AS ENUM ('TACO', 'TBCA', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MealPlanMode" AS ENUM ('QUANTITATIVE', 'EQUIVALENTS', 'QUALITATIVE');

-- CreateEnum
CREATE TYPE "MealPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EnergyFormula" AS ENUM ('MIFFLIN', 'HARRIS_BENEDICT', 'FAO_WHO', 'CUSTOM');

-- CreateEnum
CREATE TYPE "NutritionEvolutionFormat" AS ENUM ('ADIME', 'SOAP');

-- AlterTable
ALTER TABLE "clinics" ADD COLUMN     "enabled_modules" "Specialty"[] DEFAULT ARRAY['FISIOTERAPIA']::"Specialty"[];

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "allergies_summary" TEXT,
ADD COLUMN     "biological_sex" "BiologicalSex",
ADD COLUMN     "dietary_restrictions" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "council_number" TEXT,
ADD COLUMN     "council_state" CHAR(2),
ADD COLUMN     "council_type" "CouncilType",
ADD COLUMN     "specialty" "Specialty";

-- CreateTable
CREATE TABLE "nutrition_anamneses" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "responses" JSONB NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nutrition_anamneses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anthropometric_assessments" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "measured_at" TIMESTAMP(3) NOT NULL,
    "weight_kg" DECIMAL(6,2) NOT NULL,
    "height_cm" DECIMAL(5,2) NOT NULL,
    "bmi" DECIMAL(5,2),
    "circumferences" JSONB,
    "skinfolds" JSONB,
    "body_fat_protocol" TEXT,
    "body_fat_pct" DECIMAL(5,2),
    "lean_mass_kg" DECIMAL(6,2),
    "fat_mass_kg" DECIMAL(6,2),
    "bioimpedance" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anthropometric_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "energy_calculations" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "assessment_id" TEXT,
    "formula" "EnergyFormula" NOT NULL,
    "activity_factor" DECIMAL(4,2) NOT NULL,
    "bmr_kcal" INTEGER NOT NULL,
    "tdee_kcal" INTEGER NOT NULL,
    "target_kcal" INTEGER NOT NULL,
    "carb_pct" DECIMAL(5,2) NOT NULL,
    "protein_pct" DECIMAL(5,2) NOT NULL,
    "fat_pct" DECIMAL(5,2) NOT NULL,
    "protein_g_per_kg" DECIMAL(4,2),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "energy_calculations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_items" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT,
    "source" "FoodSource" NOT NULL,
    "source_code" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "kcal_per_100g" DECIMAL(8,2) NOT NULL,
    "carbs_per_100g" DECIMAL(8,2) NOT NULL,
    "protein_per_100g" DECIMAL(8,2) NOT NULL,
    "fat_per_100g" DECIMAL(8,2) NOT NULL,
    "fiber_per_100g" DECIMAL(8,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "food_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "food_measures" (
    "id" TEXT NOT NULL,
    "food_item_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "grams" DECIMAL(8,2) NOT NULL,

    CONSTRAINT "food_measures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_plans" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "objective" TEXT,
    "mode" "MealPlanMode" NOT NULL DEFAULT 'QUANTITATIVE',
    "status" "MealPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "target_kcal" INTEGER,
    "calculated_totals" JSONB,
    "general_notes" TEXT,
    "cloned_from_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meals" (
    "id" TEXT NOT NULL,
    "meal_plan_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scheduled_time" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_items" (
    "id" TEXT NOT NULL,
    "meal_id" TEXT NOT NULL,
    "food_item_id" TEXT,
    "custom_label" TEXT,
    "measure_label" TEXT NOT NULL,
    "quantity" DECIMAL(8,2) NOT NULL,
    "grams" DECIMAL(8,2) NOT NULL,
    "nutrients_snapshot" JSONB NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "meal_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_substitutions" (
    "id" TEXT NOT NULL,
    "meal_item_id" TEXT NOT NULL,
    "substitute_food_item_id" TEXT,
    "measure_label" TEXT NOT NULL,
    "quantity" DECIMAL(8,2) NOT NULL,
    "grams" DECIMAL(8,2) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "meal_substitutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutrition_evolutions" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "format" "NutritionEvolutionFormat" NOT NULL DEFAULT 'ADIME',
    "assessment" TEXT,
    "nutrition_diagnosis" TEXT,
    "intervention" TEXT,
    "monitoring_evaluation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nutrition_evolutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_goals" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "metric_type" TEXT NOT NULL,
    "target_value" TEXT,
    "current_value" TEXT,
    "due_date" DATE,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nutrition_anamneses_clinic_id_patient_id_recorded_at_idx" ON "nutrition_anamneses"("clinic_id", "patient_id", "recorded_at");

-- CreateIndex
CREATE INDEX "anthropometric_assessments_clinic_id_patient_id_measured_at_idx" ON "anthropometric_assessments"("clinic_id", "patient_id", "measured_at");

-- CreateIndex
CREATE INDEX "energy_calculations_clinic_id_patient_id_created_at_idx" ON "energy_calculations"("clinic_id", "patient_id", "created_at");

-- CreateIndex
CREATE INDEX "food_items_name_idx" ON "food_items"("name");

-- CreateIndex
CREATE INDEX "food_items_clinic_id_name_idx" ON "food_items"("clinic_id", "name");

-- CreateIndex
CREATE INDEX "food_items_source_source_code_idx" ON "food_items"("source", "source_code");

-- CreateIndex
CREATE UNIQUE INDEX "food_measures_food_item_id_label_key" ON "food_measures"("food_item_id", "label");

-- CreateIndex
CREATE INDEX "meal_plans_clinic_id_patient_id_status_idx" ON "meal_plans"("clinic_id", "patient_id", "status");

-- CreateIndex
CREATE INDEX "nutrition_evolutions_clinic_id_patient_id_created_at_idx" ON "nutrition_evolutions"("clinic_id", "patient_id", "created_at");

-- CreateIndex
CREATE INDEX "patient_goals_clinic_id_patient_id_status_idx" ON "patient_goals"("clinic_id", "patient_id", "status");

-- AddForeignKey
ALTER TABLE "nutrition_anamneses" ADD CONSTRAINT "nutrition_anamneses_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrition_anamneses" ADD CONSTRAINT "nutrition_anamneses_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrition_anamneses" ADD CONSTRAINT "nutrition_anamneses_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anthropometric_assessments" ADD CONSTRAINT "anthropometric_assessments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anthropometric_assessments" ADD CONSTRAINT "anthropometric_assessments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anthropometric_assessments" ADD CONSTRAINT "anthropometric_assessments_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_calculations" ADD CONSTRAINT "energy_calculations_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_calculations" ADD CONSTRAINT "energy_calculations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_calculations" ADD CONSTRAINT "energy_calculations_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "energy_calculations" ADD CONSTRAINT "energy_calculations_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "anthropometric_assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_items" ADD CONSTRAINT "food_items_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "food_measures" ADD CONSTRAINT "food_measures_food_item_id_fkey" FOREIGN KEY ("food_item_id") REFERENCES "food_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meals" ADD CONSTRAINT "meals_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "meal_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_meal_id_fkey" FOREIGN KEY ("meal_id") REFERENCES "meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_food_item_id_fkey" FOREIGN KEY ("food_item_id") REFERENCES "food_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_substitutions" ADD CONSTRAINT "meal_substitutions_meal_item_id_fkey" FOREIGN KEY ("meal_item_id") REFERENCES "meal_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_substitutions" ADD CONSTRAINT "meal_substitutions_substitute_food_item_id_fkey" FOREIGN KEY ("substitute_food_item_id") REFERENCES "food_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrition_evolutions" ADD CONSTRAINT "nutrition_evolutions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrition_evolutions" ADD CONSTRAINT "nutrition_evolutions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrition_evolutions" ADD CONSTRAINT "nutrition_evolutions_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_goals" ADD CONSTRAINT "patient_goals_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_goals" ADD CONSTRAINT "patient_goals_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_goals" ADD CONSTRAINT "patient_goals_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
