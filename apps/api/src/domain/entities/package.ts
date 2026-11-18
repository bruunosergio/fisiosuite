import { PackageStatus } from './enums';

export type PackagePlan = {
  id: string;
  clinicId: string;
  name: string;
  sessionCount: number;
  priceCents: number;
  validityDays: number | null;
  active: boolean;
  createdAt: Date;
};

export type PatientPackage = {
  id: string;
  clinicId: string;
  patientId: string;
  planId: string;
  totalSessions: number;
  usedSessions: number;
  status: PackageStatus;
  purchasedAt: Date;
  expiresAt: Date | null;
  priceCents: number;
  createdAt: Date;
  updatedAt: Date;
};

export function remainingSessions(pkg: PatientPackage): number {
  return Math.max(0, pkg.totalSessions - pkg.usedSessions);
}
