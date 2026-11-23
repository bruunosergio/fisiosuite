import type { Result } from '../../core/result';
import type { Failure } from '../../failures';
import type { BiologicalSex, Patient } from '../../entities';

export type UpsertPatientCommand = {
  clinicId: string;
  id?: string;
  name: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  cpf?: string | null;
  birthDate?: Date | null;
  biologicalSex?: BiologicalSex | null;
  allergiesSummary?: string | null;
  dietaryRestrictions?: string | null;
  notes?: string | null;
  active?: boolean;
};

export interface PatientUseCase {
  create(cmd: UpsertPatientCommand): Promise<Result<Patient, Failure>>;
  update(cmd: UpsertPatientCommand & { id: string }): Promise<Result<Patient, Failure>>;
  list(clinicId: string): Promise<Result<Patient[], Failure>>;
  search(clinicId: string, query: string): Promise<Result<Patient[], Failure>>;
  getById(clinicId: string, id: string): Promise<Result<Patient, Failure>>;
}
