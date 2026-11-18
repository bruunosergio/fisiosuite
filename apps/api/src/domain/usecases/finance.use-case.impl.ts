import { Result } from '../core/result';
import type { Failure } from '../failures';
import { NotFoundFailure, ValidationFailure } from '../failures';
import {
  AppointmentStatus,
  PaymentStatus,
  type Payment,
  type PaymentMethod,
} from '../entities';
import { isOverdue } from '../entities/payment';
import type {
  CommissionLine,
  CommissionReport,
  FinanceSummary,
  FinanceUseCase,
} from '../ports/input/finance.use-case';
import type {
  AppointmentRepository,
  ClinicRepository,
  IdGeneratorPort,
  PackageRepository,
  PaymentRepository,
  UserRepository,
} from '../ports/output';

export class FinanceUseCaseImpl implements FinanceUseCase {
  constructor(
    private readonly payments: PaymentRepository,
    private readonly appointments: AppointmentRepository,
    private readonly users: UserRepository,
    private readonly clinics: ClinicRepository,
    private readonly packages: PackageRepository,
    private readonly ids: IdGeneratorPort,
  ) {}

  async listPayments(
    clinicId: string,
    filters?: { from?: Date; to?: Date; status?: PaymentStatus },
  ): Promise<Result<Payment[], Failure>> {
    return Result.ok(
      await this.payments.listByClinic(clinicId, filters?.from, filters?.to, filters?.status),
    );
  }

  async summary(clinicId: string): Promise<Result<FinanceSummary, Failure>> {
    const all = await this.payments.listByClinic(clinicId);
    const now = new Date();
    let receivedCents = 0;
    let pendingCents = 0;
    let overdueCents = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    for (const p of all) {
      if (p.status === PaymentStatus.PAID) {
        receivedCents += p.amountCents;
        continue;
      }
      if (p.status === PaymentStatus.CANCELLED) continue;
      pendingCents += p.amountCents;
      pendingCount += 1;
      if (isOverdue(p, now)) {
        overdueCents += p.amountCents;
        overdueCount += 1;
      }
    }

    return Result.ok({
      receivedCents,
      pendingCents,
      overdueCents,
      pendingCount,
      overdueCount,
    });
  }

  async registerPayment(cmd: {
    clinicId: string;
    patientId: string;
    packageId?: string | null;
    amountCents: number;
    method: PaymentMethod;
    status?: PaymentStatus;
    dueDate?: Date | null;
    notes?: string | null;
  }): Promise<Result<Payment, Failure>> {
    if (cmd.amountCents <= 0) {
      return Result.error(new ValidationFailure('Valor deve ser maior que zero.'));
    }
    const now = new Date();
    const status = cmd.status ?? PaymentStatus.PENDING;
    const payment: Payment = {
      id: this.ids.generate(),
      clinicId: cmd.clinicId,
      patientId: cmd.patientId,
      packageId: cmd.packageId ?? null,
      amountCents: cmd.amountCents,
      method: cmd.method,
      status,
      dueDate: cmd.dueDate ?? (status === PaymentStatus.PENDING ? now : null),
      installmentNumber: 1,
      installmentTotal: 1,
      paidAt: status === PaymentStatus.PAID ? now : null,
      notes: cmd.notes ?? null,
      createdAt: now,
    };
    return Result.ok(await this.payments.create(payment));
  }

  async settlePayment(cmd: {
    clinicId: string;
    paymentId: string;
    method?: PaymentMethod;
    paidAt?: Date;
    notes?: string | null;
  }): Promise<Result<Payment, Failure>> {
    const existing = await this.payments.findById(cmd.clinicId, cmd.paymentId);
    if (!existing) {
      return Result.error(new NotFoundFailure('Cobrança', cmd.paymentId));
    }
    if (existing.status === PaymentStatus.PAID) {
      return Result.error(new ValidationFailure('Esta cobrança já está paga.'));
    }
    if (existing.status === PaymentStatus.CANCELLED) {
      return Result.error(new ValidationFailure('Cobrança cancelada não pode ser baixada.'));
    }

    const updated: Payment = {
      ...existing,
      status: PaymentStatus.PAID,
      method: cmd.method ?? existing.method,
      paidAt: cmd.paidAt ?? new Date(),
      notes: cmd.notes ?? existing.notes,
    };
    return Result.ok(await this.payments.update(updated));
  }

  async commissionReport(cmd: {
    clinicId: string;
    professionalId: string;
    from: Date;
    to: Date;
  }): Promise<Result<CommissionReport, Failure>> {
    const clinic = await this.clinics.findById(cmd.clinicId);
    if (!clinic) return Result.error(new NotFoundFailure('Clínica', cmd.clinicId));

    const professional = await this.users.findById(cmd.clinicId, cmd.professionalId);
    if (!professional) {
      return Result.error(new NotFoundFailure('Profissional', cmd.professionalId));
    }

    const pct = Number(professional.commissionPct ?? 0);
    const items = await this.appointments.listCompletedInPeriod({
      clinicId: cmd.clinicId,
      professionalId: cmd.professionalId,
      from: cmd.from,
      to: cmd.to,
    });

    const lines: CommissionLine[] = [];

    for (const appt of items) {
      const isMakeup = Boolean(appt.makeupOfId);
      const isNoShow = appt.status === AppointmentStatus.NO_SHOW;

      if (isNoShow && !clinic.commissionOnNoShow) continue;
      if (isMakeup && !clinic.commissionOnMakeup) continue;
      if (
        appt.status !== AppointmentStatus.COMPLETED &&
        !(isNoShow && clinic.commissionOnNoShow)
      ) {
        continue;
      }

      let sessionPriceCents = 0;
      if (appt.packageId) {
        const pkg = await this.packages.findPatientPackage(cmd.clinicId, appt.packageId);
        if (pkg && pkg.totalSessions > 0) {
          sessionPriceCents = Math.round(pkg.priceCents / pkg.totalSessions);
        }
      }

      const commissionCents = Math.round((sessionPriceCents * pct) / 100);
      lines.push({
        appointmentId: appt.id,
        startsAt: appt.startsAt,
        status: appt.status,
        isMakeup,
        sessionPriceCents,
        commissionCents,
      });
    }

    return Result.ok({
      professionalId: professional.id,
      professionalName: professional.name,
      commissionPct: pct,
      lines,
      totalCommissionCents: lines.reduce((acc, l) => acc + l.commissionCents, 0),
    });
  }
}
