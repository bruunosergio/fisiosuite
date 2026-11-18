import { Result } from '../core/result';
import type { Failure } from '../failures';
import { NotFoundFailure, ValidationFailure } from '../failures';
import {
  AppointmentStatus,
  type ClinicalRecord,
  type SessionNote,
  type SessionNoteHistoryItem,
} from '../entities';
import type {
  ClinicalUseCase,
  CreateClinicalRecordCommand,
  UpsertSessionNoteCommand,
} from '../ports/input/clinical.use-case';
import type {
  AppointmentRepository,
  ClinicalRepository,
  IdGeneratorPort,
  PatientRepository,
} from '../ports/output';
import type { AppointmentUseCase } from '../ports/input/appointment.use-case';

export class ClinicalUseCaseImpl implements ClinicalUseCase {
  constructor(
    private readonly clinical: ClinicalRepository,
    private readonly patients: PatientRepository,
    private readonly appointments: AppointmentRepository,
    private readonly appointmentUseCase: AppointmentUseCase,
    private readonly ids: IdGeneratorPort,
  ) {}

  async createRecord(
    cmd: CreateClinicalRecordCommand,
  ): Promise<Result<ClinicalRecord, Failure>> {
    if (!cmd.chiefComplaint?.trim()) {
      return Result.error(new ValidationFailure('Queixa principal é obrigatória.'));
    }
    const patient = await this.patients.findById(cmd.clinicId, cmd.patientId);
    if (!patient) return Result.error(new NotFoundFailure('Paciente', cmd.patientId));

    if (cmd.painScale != null && (cmd.painScale < 0 || cmd.painScale > 10)) {
      return Result.error(new ValidationFailure('Escala de dor deve ser entre 0 e 10.'));
    }

    const now = new Date();
    const record: ClinicalRecord = {
      id: this.ids.generate(),
      clinicId: cmd.clinicId,
      patientId: cmd.patientId,
      professionalId: cmd.professionalId,
      chiefComplaint: cmd.chiefComplaint.trim(),
      anamnesis: cmd.anamnesis ?? null,
      painMap: cmd.painMap ?? null,
      painScale: cmd.painScale ?? null,
      assessment: cmd.assessment ?? null,
      plan: cmd.plan ?? null,
      createdAt: now,
      updatedAt: now,
    };
    return Result.ok(await this.clinical.createRecord(record));
  }

  async listRecords(
    clinicId: string,
    patientId: string,
  ): Promise<Result<ClinicalRecord[], Failure>> {
    return Result.ok(await this.clinical.listRecords(clinicId, patientId));
  }

  async listSessionNotes(
    clinicId: string,
    patientId: string,
  ): Promise<Result<SessionNoteHistoryItem[], Failure>> {
    return Result.ok(await this.clinical.listSessionNotesByPatient(clinicId, patientId));
  }

  async upsertSessionNote(
    cmd: UpsertSessionNoteCommand,
  ): Promise<Result<SessionNote, Failure>> {
    const appt = await this.appointments.findById(cmd.clinicId, cmd.appointmentId);
    if (!appt) return Result.error(new NotFoundFailure('Agendamento', cmd.appointmentId));

    const existing = await this.clinical.findSessionNoteByAppointment(cmd.appointmentId);
    const now = new Date();
    const note: SessionNote = {
      id: existing?.id ?? this.ids.generate(),
      appointmentId: cmd.appointmentId,
      professionalId: cmd.professionalId,
      subjective: cmd.subjective ?? existing?.subjective ?? null,
      objective: cmd.objective ?? existing?.objective ?? null,
      assessment: cmd.assessment ?? existing?.assessment ?? null,
      plan: cmd.plan ?? existing?.plan ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const saved = await this.clinical.upsertSessionNote(note);

    if (cmd.markCompleted !== false && appt.status !== AppointmentStatus.COMPLETED) {
      const transition = await this.appointmentUseCase.transition({
        clinicId: cmd.clinicId,
        appointmentId: cmd.appointmentId,
        status: AppointmentStatus.COMPLETED,
      });
      if (transition.isErr) return Result.error(transition.error);
    }

    return Result.ok(saved);
  }
}
