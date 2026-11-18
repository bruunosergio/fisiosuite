import type { Result } from '../../core/result';
import type { Failure } from '../../failures';
import type { ClinicalRecord, PainMap, SessionNote, SessionNoteHistoryItem } from '../../entities';

export type CreateClinicalRecordCommand = {
  clinicId: string;
  patientId: string;
  professionalId: string;
  chiefComplaint: string;
  anamnesis?: string | null;
  painMap?: PainMap | null;
  painScale?: number | null;
  assessment?: string | null;
  plan?: string | null;
};

export type UpsertSessionNoteCommand = {
  clinicId: string;
  appointmentId: string;
  professionalId: string;
  subjective?: string | null;
  objective?: string | null;
  assessment?: string | null;
  plan?: string | null;
  markCompleted?: boolean;
};

export interface ClinicalUseCase {
  createRecord(cmd: CreateClinicalRecordCommand): Promise<Result<ClinicalRecord, Failure>>;
  listRecords(clinicId: string, patientId: string): Promise<Result<ClinicalRecord[], Failure>>;
  listSessionNotes(
    clinicId: string,
    patientId: string,
  ): Promise<Result<SessionNoteHistoryItem[], Failure>>;
  upsertSessionNote(cmd: UpsertSessionNoteCommand): Promise<Result<SessionNote, Failure>>;
}
