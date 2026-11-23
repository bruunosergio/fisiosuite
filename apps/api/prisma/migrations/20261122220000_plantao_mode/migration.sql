-- CreateEnum
CREATE TYPE "BedStatus" AS ENUM ('FREE', 'OCCUPIED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "AdmissionStatus" AS ENUM ('ACTIVE', 'DISCHARGED');

-- CreateEnum
CREATE TYPE "DischargeDestination" AS ENUM ('HOME', 'TRANSFER', 'DEATH', 'OTHER_WARD', 'OTHER');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('OPEN', 'HANDOFF', 'CLOSED');

-- CreateEnum
CREATE TYPE "CensusPriority" AS ENUM ('CRITICAL', 'WATCH', 'STABLE');

-- CreateEnum
CREATE TYPE "CensusItemStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'CONTRAINDICATED', 'DISCHARGED_TODAY');

-- CreateTable
CREATE TABLE "hospital_sites" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hospital_sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wards" (
    "id" TEXT NOT NULL,
    "hospital_site_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beds" (
    "id" TEXT NOT NULL,
    "ward_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "BedStatus" NOT NULL DEFAULT 'FREE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admissions" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "hospital_site_id" TEXT NOT NULL,
    "bed_id" TEXT NOT NULL,
    "hospital_mrn" TEXT,
    "insurance_name" TEXT,
    "admitted_at" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "diagnosis" TEXT,
    "responsible_physician" TEXT,
    "expected_discharge_at" TIMESTAMP(3),
    "precautions" JSONB,
    "mobility_level" TEXT,
    "assistance_needed" TEXT,
    "initial_goals" TEXT,
    "open_pending" TEXT,
    "status" "AdmissionStatus" NOT NULL DEFAULT 'ACTIVE',
    "discharged_at" TIMESTAMP(3),
    "discharge_destination" "DischargeDestination",
    "discharge_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "hospital_site_id" TEXT NOT NULL,
    "opened_by_id" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "ward_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ShiftStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_assignments" (
    "id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "shift_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "census_items" (
    "id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "admission_id" TEXT NOT NULL,
    "priority" "CensusPriority" NOT NULL DEFAULT 'STABLE',
    "status" "CensusItemStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "census_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plantao_encounters" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "admission_id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "conducted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conduct" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "response" TEXT,
    "intercurrence" TEXT,
    "pain_scale" INTEGER,
    "dyspnea_scale" INTEGER,
    "mobility_assist" TEXT,
    "precautions_update" JSONB,
    "pending_for_next" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plantao_encounters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "handoffs" (
    "id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "from_user_id" TEXT NOT NULL,
    "to_user_id" TEXT,
    "summary" JSONB NOT NULL,
    "notes" TEXT,
    "confirmed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "handoffs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hospital_sites_clinic_id_name_key" ON "hospital_sites"("clinic_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "wards_hospital_site_id_name_key" ON "wards"("hospital_site_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "beds_ward_id_code_key" ON "beds"("ward_id", "code");

-- CreateIndex
CREATE INDEX "admissions_clinic_id_status_idx" ON "admissions"("clinic_id", "status");

-- CreateIndex
CREATE INDEX "admissions_clinic_id_hospital_site_id_status_idx" ON "admissions"("clinic_id", "hospital_site_id", "status");

-- CreateIndex
CREATE INDEX "shifts_clinic_id_status_idx" ON "shifts"("clinic_id", "status");

-- CreateIndex
CREATE INDEX "shifts_clinic_id_hospital_site_id_starts_at_idx" ON "shifts"("clinic_id", "hospital_site_id", "starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "shift_assignments_shift_id_user_id_key" ON "shift_assignments"("shift_id", "user_id");

-- CreateIndex
CREATE INDEX "census_items_shift_id_status_idx" ON "census_items"("shift_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "census_items_shift_id_admission_id_key" ON "census_items"("shift_id", "admission_id");

-- CreateIndex
CREATE INDEX "plantao_encounters_clinic_id_admission_id_conducted_at_idx" ON "plantao_encounters"("clinic_id", "admission_id", "conducted_at");

-- CreateIndex
CREATE INDEX "plantao_encounters_shift_id_conducted_at_idx" ON "plantao_encounters"("shift_id", "conducted_at");

-- CreateIndex
CREATE UNIQUE INDEX "handoffs_shift_id_key" ON "handoffs"("shift_id");

-- AddForeignKey
ALTER TABLE "hospital_sites" ADD CONSTRAINT "hospital_sites_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wards" ADD CONSTRAINT "wards_hospital_site_id_fkey" FOREIGN KEY ("hospital_site_id") REFERENCES "hospital_sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beds" ADD CONSTRAINT "beds_ward_id_fkey" FOREIGN KEY ("ward_id") REFERENCES "wards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_hospital_site_id_fkey" FOREIGN KEY ("hospital_site_id") REFERENCES "hospital_sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_bed_id_fkey" FOREIGN KEY ("bed_id") REFERENCES "beds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_hospital_site_id_fkey" FOREIGN KEY ("hospital_site_id") REFERENCES "hospital_sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_opened_by_id_fkey" FOREIGN KEY ("opened_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "census_items" ADD CONSTRAINT "census_items_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "census_items" ADD CONSTRAINT "census_items_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "admissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantao_encounters" ADD CONSTRAINT "plantao_encounters_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantao_encounters" ADD CONSTRAINT "plantao_encounters_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "admissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plantao_encounters" ADD CONSTRAINT "plantao_encounters_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handoffs" ADD CONSTRAINT "handoffs_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handoffs" ADD CONSTRAINT "handoffs_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "handoffs" ADD CONSTRAINT "handoffs_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
