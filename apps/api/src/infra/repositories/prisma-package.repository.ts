import { Injectable } from '@nestjs/common';
import { PackageStatus } from '@prisma/client';
import type { PackagePlan, PatientPackage } from '../../domain/entities';
import type { PackageRepository } from '../../domain/ports/output';
import { PrismaService } from '../database/prisma.service';
import { mapPackagePlan, mapPatientPackage } from '../mappers/domain.mappers';

@Injectable()
export class PrismaPackageRepository implements PackageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createPlan(plan: PackagePlan): Promise<PackagePlan> {
    const row = await this.prisma.packagePlan.create({
      data: {
        id: plan.id,
        clinicId: plan.clinicId,
        name: plan.name,
        sessionCount: plan.sessionCount,
        priceCents: plan.priceCents,
        validityDays: plan.validityDays,
        active: plan.active,
        createdAt: plan.createdAt,
      },
    });
    return mapPackagePlan(row);
  }

  async updatePlan(plan: PackagePlan): Promise<PackagePlan> {
    const row = await this.prisma.packagePlan.update({
      where: { id: plan.id },
      data: {
        name: plan.name,
        sessionCount: plan.sessionCount,
        priceCents: plan.priceCents,
        validityDays: plan.validityDays,
        active: plan.active,
      },
    });
    return mapPackagePlan(row);
  }

  async listPlans(clinicId: string): Promise<PackagePlan[]> {
    const rows = await this.prisma.packagePlan.findMany({
      where: { clinicId, active: true },
      orderBy: { name: 'asc' },
    });
    return rows.map(mapPackagePlan);
  }

  async findPlanById(clinicId: string, id: string): Promise<PackagePlan | null> {
    const row = await this.prisma.packagePlan.findFirst({ where: { id, clinicId } });
    return row ? mapPackagePlan(row) : null;
  }

  async createPatientPackage(pkg: PatientPackage): Promise<PatientPackage> {
    const row = await this.prisma.patientPackage.create({
      data: {
        id: pkg.id,
        clinicId: pkg.clinicId,
        patientId: pkg.patientId,
        planId: pkg.planId,
        totalSessions: pkg.totalSessions,
        usedSessions: pkg.usedSessions,
        status: pkg.status,
        purchasedAt: pkg.purchasedAt,
        expiresAt: pkg.expiresAt,
        priceCents: pkg.priceCents,
        createdAt: pkg.createdAt,
        updatedAt: pkg.updatedAt,
      },
    });
    return mapPatientPackage(row);
  }

  async findPatientPackage(clinicId: string, id: string): Promise<PatientPackage | null> {
    const row = await this.prisma.patientPackage.findFirst({ where: { id, clinicId } });
    return row ? mapPatientPackage(row) : null;
  }

  async listPatientPackages(clinicId: string, patientId?: string): Promise<PatientPackage[]> {
    const rows = await this.prisma.patientPackage.findMany({
      where: {
        clinicId,
        ...(patientId ? { patientId } : {}),
      },
      orderBy: { purchasedAt: 'desc' },
    });
    return rows.map(mapPatientPackage);
  }

  async listRenewalAlerts(
    clinicId: string,
    remainingThreshold: number,
  ): Promise<PatientPackage[]> {
    const rows = await this.prisma.patientPackage.findMany({
      where: {
        clinicId,
        status: PackageStatus.ACTIVE,
      },
      orderBy: { purchasedAt: 'asc' },
    });
    return rows
      .map(mapPatientPackage)
      .filter((p) => p.totalSessions - p.usedSessions <= remainingThreshold);
  }

  async updatePatientPackage(pkg: PatientPackage): Promise<PatientPackage> {
    const row = await this.prisma.patientPackage.update({
      where: { id: pkg.id },
      data: {
        usedSessions: pkg.usedSessions,
        status: pkg.status,
        expiresAt: pkg.expiresAt,
        updatedAt: pkg.updatedAt,
      },
    });
    return mapPatientPackage(row);
  }
}
