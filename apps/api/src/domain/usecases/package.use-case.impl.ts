import { Result } from '../core/result';
import type { Failure } from '../failures';
import { NotFoundFailure, ValidationFailure } from '../failures';
import {
  PackageStatus,
  PaymentMethod,
  PaymentStatus,
  type PackagePlan,
  type PatientPackage,
  type Payment,
  type PaymentMode,
} from '../entities';
import { splitInstallments } from '../entities/payment';
import type {
  CreatePlanCommand,
  PackageUseCase,
  SellPackageCommand,
  UpdatePlanCommand,
} from '../ports/input/package.use-case';
import type {
  IdGeneratorPort,
  PackageRepository,
  PatientRepository,
  PaymentRepository,
} from '../ports/output';

function resolvePaymentMode(cmd: SellPackageCommand): PaymentMode {
  if (cmd.paymentMode) return cmd.paymentMode;
  if (cmd.markAsPaid === false) return 'ON_ACCOUNT';
  if (cmd.markAsPaid === true) return 'PAID_NOW';
  return 'PAID_NOW';
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export class PackageUseCaseImpl implements PackageUseCase {
  constructor(
    private readonly packages: PackageRepository,
    private readonly patients: PatientRepository,
    private readonly payments: PaymentRepository,
    private readonly ids: IdGeneratorPort,
  ) {}

  async createPlan(cmd: CreatePlanCommand): Promise<Result<PackagePlan, Failure>> {
    if (!cmd.name?.trim() || cmd.sessionCount < 1 || cmd.priceCents < 0) {
      return Result.error(
        new ValidationFailure('Informe nome, quantidade de sessões (>0) e preço válido.'),
      );
    }
    const plan: PackagePlan = {
      id: this.ids.generate(),
      clinicId: cmd.clinicId,
      name: cmd.name.trim(),
      sessionCount: cmd.sessionCount,
      priceCents: cmd.priceCents,
      validityDays: cmd.validityDays ?? null,
      active: true,
      createdAt: new Date(),
    };
    return Result.ok(await this.packages.createPlan(plan));
  }

  async updatePlan(cmd: UpdatePlanCommand): Promise<Result<PackagePlan, Failure>> {
    if (!cmd.name?.trim() || cmd.sessionCount < 1 || cmd.priceCents < 0) {
      return Result.error(
        new ValidationFailure('Informe nome, quantidade de sessões (>0) e preço válido.'),
      );
    }
    const existing = await this.packages.findPlanById(cmd.clinicId, cmd.id);
    if (!existing) return Result.error(new NotFoundFailure('Plano de pacote', cmd.id));

    const updated: PackagePlan = {
      ...existing,
      name: cmd.name.trim(),
      sessionCount: cmd.sessionCount,
      priceCents: cmd.priceCents,
      validityDays: cmd.validityDays === undefined ? existing.validityDays : cmd.validityDays,
      active: cmd.active !== undefined ? cmd.active : existing.active,
    };
    return Result.ok(await this.packages.updatePlan(updated));
  }

  async deactivatePlan(clinicId: string, id: string): Promise<Result<PackagePlan, Failure>> {
    const existing = await this.packages.findPlanById(clinicId, id);
    if (!existing) return Result.error(new NotFoundFailure('Plano de pacote', id));
    return Result.ok(await this.packages.updatePlan({ ...existing, active: false }));
  }

  async listPlans(clinicId: string): Promise<Result<PackagePlan[], Failure>> {
    return Result.ok(await this.packages.listPlans(clinicId));
  }

  async sell(cmd: SellPackageCommand): Promise<Result<PatientPackage, Failure>> {
    const patient = await this.patients.findById(cmd.clinicId, cmd.patientId);
    if (!patient) return Result.error(new NotFoundFailure('Paciente', cmd.patientId));

    const plan = await this.packages.findPlanById(cmd.clinicId, cmd.planId);
    if (!plan || !plan.active) {
      return Result.error(new NotFoundFailure('Plano de pacote', cmd.planId));
    }

    const mode = resolvePaymentMode(cmd);
    const installmentCount =
      mode === 'INSTALLMENTS' ? Math.floor(cmd.installments ?? 0) : mode === 'ON_ACCOUNT' ? 1 : 1;

    if (mode === 'INSTALLMENTS' && (installmentCount < 2 || installmentCount > 24)) {
      return Result.error(new ValidationFailure('Parcelamento: informe entre 2 e 24 parcelas.'));
    }

    const now = new Date();
    let expiresAt: Date | null = null;
    if (plan.validityDays && plan.validityDays > 0) {
      expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + plan.validityDays);
    }

    const pkg: PatientPackage = {
      id: this.ids.generate(),
      clinicId: cmd.clinicId,
      patientId: cmd.patientId,
      planId: plan.id,
      totalSessions: plan.sessionCount,
      usedSessions: 0,
      status: PackageStatus.ACTIVE,
      purchasedAt: now,
      expiresAt,
      priceCents: plan.priceCents,
      createdAt: now,
      updatedAt: now,
    };
    await this.packages.createPatientPackage(pkg);

    const method = cmd.paymentMethod ?? PaymentMethod.PIX;
    let firstDue = cmd.firstDueDate ? new Date(`${cmd.firstDueDate}T12:00:00`) : new Date(now);
    if (Number.isNaN(firstDue.getTime())) {
      return Result.error(new ValidationFailure('Data do primeiro vencimento inválida.'));
    }

    if (mode === 'PAID_NOW') {
      const payment: Payment = {
        id: this.ids.generate(),
        clinicId: cmd.clinicId,
        patientId: cmd.patientId,
        packageId: pkg.id,
        amountCents: plan.priceCents,
        method,
        status: PaymentStatus.PAID,
        dueDate: firstDue,
        installmentNumber: 1,
        installmentTotal: 1,
        paidAt: now,
        notes: `Venda pacote (à vista): ${plan.name}`,
        createdAt: now,
      };
      await this.payments.create(payment);
      return Result.ok(pkg);
    }

    // ON_ACCOUNT ou INSTALLMENTS → gera dívida(s) a receber
    const count = mode === 'INSTALLMENTS' ? installmentCount : 1;
    const amounts = splitInstallments(plan.priceCents, count);

    for (let i = 0; i < count; i++) {
      const dueDate = i === 0 ? firstDue : addMonths(firstDue, i);
      const payment: Payment = {
        id: this.ids.generate(),
        clinicId: cmd.clinicId,
        patientId: cmd.patientId,
        packageId: pkg.id,
        amountCents: amounts[i],
        method,
        status: PaymentStatus.PENDING,
        dueDate,
        installmentNumber: i + 1,
        installmentTotal: count,
        paidAt: null,
        notes:
          count > 1
            ? `Parcela ${i + 1}/${count} — pacote ${plan.name}`
            : `Conta a receber — pacote ${plan.name}`,
        createdAt: now,
      };
      await this.payments.create(payment);
    }

    return Result.ok(pkg);
  }

  async listPatientPackages(
    clinicId: string,
    patientId?: string,
  ): Promise<Result<PatientPackage[], Failure>> {
    return Result.ok(await this.packages.listPatientPackages(clinicId, patientId));
  }

  async renewalAlerts(clinicId: string): Promise<Result<PatientPackage[], Failure>> {
    return Result.ok(await this.packages.listRenewalAlerts(clinicId, 3));
  }
}
