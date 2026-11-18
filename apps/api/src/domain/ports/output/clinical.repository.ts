import type { ClinicalRecord, SessionNote, SessionNoteHistoryItem } from '../../entities';

export interface ClinicalRepository {
  createRecord(record: ClinicalRecord): Promise<ClinicalRecord>;
  listRecords(clinicId: string, patientId: string): Promise<ClinicalRecord[]>;
  findRecord(clinicId: string, id: string): Promise<ClinicalRecord | null>;
  upsertSessionNote(note: SessionNote): Promise<SessionNote>;
  findSessionNoteByAppointment(appointmentId: string): Promise<SessionNote | null>;
  listSessionNotesByPatient(clinicId: string, patientId: string): Promise<SessionNoteHistoryItem[]>;
}
