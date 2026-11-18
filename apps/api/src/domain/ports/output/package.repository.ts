import type { PackagePlan, PatientPackage } from '../../entities';

export interface PackageRepository {
  createPlan(plan: PackagePlan): Promise<PackagePlan>;
  updatePlan(plan: PackagePlan): Promise<PackagePlan>;
  listPlans(clinicId: string): Promise<PackagePlan[]>;
  findPlanById(clinicId: string, id: string): Promise<PackagePlan | null>;
  createPatientPackage(pkg: PatientPackage): Promise<PatientPackage>;
  findPatientPackage(clinicId: string, id: string): Promise<PatientPackage | null>;
  listPatientPackages(clinicId: string, patientId?: string): Promise<PatientPackage[]>;
  listRenewalAlerts(clinicId: string, remainingThreshold: number): Promise<PatientPackage[]>;
  updatePatientPackage(pkg: PatientPackage): Promise<PatientPackage>;
}
