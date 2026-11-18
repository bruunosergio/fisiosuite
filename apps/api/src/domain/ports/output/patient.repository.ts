import type { Patient } from '../../entities';

export interface PatientRepository {
  findById(clinicId: string, id: string): Promise<Patient | null>;
  search(clinicId: string, query: string): Promise<Patient[]>;
  list(clinicId: string): Promise<Patient[]>;
  create(patient: Patient): Promise<Patient>;
  update(patient: Patient): Promise<Patient>;
}
