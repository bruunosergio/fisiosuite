import type { Result } from '../../core/result';
import type { Failure } from '../../failures';
import type { Payment, PaymentMethod, PaymentStatus } from '../../entities';

export type CommissionLine = {
  appointmentId: string;
  startsAt: Date;
  status: string;
  isMakeup: boolean;
  sessionPriceCents: number;
  commissionCents: number;
};

export type CommissionReport = {
  professionalId: string;
  professionalName: string;
  commissionPct: number;
  lines: CommissionLine[];
  totalCommissionCents: number;
};

export type FinanceSummary = {
  receivedCents: number;
  pendingCents: number;
  overdueCents: number;
  pendingCount: number;
  overdueCount: number;
};

export interface FinanceUseCase {
  listPayments(
    clinicId: string,
    filters?: { from?: Date; to?: Date; status?: PaymentStatus },
  ): Promise<Result<Payment[], Failure>>;
  summary(clinicId: string): Promise<Result<FinanceSummary, Failure>>;
  registerPayment(cmd: {
    clinicId: string;
    patientId: string;
    packageId?: string | null;
    amountCents: number;
    method: PaymentMethod;
    status?: PaymentStatus;
    dueDate?: Date | null;
    notes?: string | null;
  }): Promise<Result<Payment, Failure>>;
  /** Dá baixa em uma conta a receber (PENDING/PARTIAL → PAID). */
  settlePayment(cmd: {
    clinicId: string;
    paymentId: string;
    method?: PaymentMethod;
    paidAt?: Date;
    notes?: string | null;
  }): Promise<Result<Payment, Failure>>;
  commissionReport(cmd: {
    clinicId: string;
    professionalId: string;
    from: Date;
    to: Date;
  }): Promise<Result<CommissionReport, Failure>>;
}
