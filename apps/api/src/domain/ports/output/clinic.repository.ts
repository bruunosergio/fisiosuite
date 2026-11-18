import type { Clinic } from '../../entities';

export type ClinicPlatformSummary = {
  clinic: Clinic;
  userCount: number;
  patientCount: number;
  appointmentCount: number;
  adminEmail: string | null;
};

export interface ClinicRepository {
  findById(id: string): Promise<Clinic | null>;
  create(clinic: Clinic): Promise<Clinic>;
  update(clinic: Clinic): Promise<Clinic>;
  listAll(): Promise<Clinic[]>;
  listPlatformSummaries(): Promise<ClinicPlatformSummary[]>;
}
