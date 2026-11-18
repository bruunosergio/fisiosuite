import type { Result } from '../../core/result';
import type { Failure } from '../../failures';
import type { PackagePlan, PatientPackage, PaymentMethod, PaymentMode } from '../../entities';

export type CreatePlanCommand = {
  clinicId: string;
  name: string;
  sessionCount: number;
  priceCents: number;
  validityDays?: number | null;
};

export type UpdatePlanCommand = {
  clinicId: string;
  id: string;
  name: string;
  sessionCount: number;
  priceCents: number;
  validityDays?: number | null;
  active?: boolean;
};

export type SellPackageCommand = {
  clinicId: string;
  patientId: string;
  planId: string;
  /** Forma prevista de pagamento (Pix, cartão…). */
  paymentMethod?: PaymentMethod;
  /**
   * PAID_NOW — quitado na hora (entra no caixa).
   * ON_ACCOUNT — gera 1 conta a receber (dívida).
   * INSTALLMENTS — gera N parcelas a receber.
   */
  paymentMode?: PaymentMode;
  /** @deprecated use paymentMode; mantido por compatibilidade. */
  markAsPaid?: boolean;
  installments?: number;
  /** Primeiro vencimento (ISO date). Default: hoje (à vista a receber) ou +30d por parcela. */
  firstDueDate?: string | null;
};

export interface PackageUseCase {
  createPlan(cmd: CreatePlanCommand): Promise<Result<PackagePlan, Failure>>;
  updatePlan(cmd: UpdatePlanCommand): Promise<Result<PackagePlan, Failure>>;
  deactivatePlan(clinicId: string, id: string): Promise<Result<PackagePlan, Failure>>;
  listPlans(clinicId: string): Promise<Result<PackagePlan[], Failure>>;
  sell(cmd: SellPackageCommand): Promise<Result<PatientPackage, Failure>>;
  listPatientPackages(clinicId: string, patientId?: string): Promise<Result<PatientPackage[], Failure>>;
  renewalAlerts(clinicId: string): Promise<Result<PatientPackage[], Failure>>;
}
