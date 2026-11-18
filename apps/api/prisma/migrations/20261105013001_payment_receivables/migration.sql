-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "due_date" DATE,
ADD COLUMN     "installment_number" INTEGER,
ADD COLUMN     "installment_total" INTEGER;

-- CreateIndex
CREATE INDEX "payments_clinic_id_due_date_idx" ON "payments"("clinic_id", "due_date");
