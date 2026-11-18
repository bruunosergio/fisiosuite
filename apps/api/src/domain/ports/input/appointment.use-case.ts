import type { Result } from '../../core/result';
import type { Failure } from '../../failures';
import type { AbsenceKind, Appointment, AppointmentStatus } from '../../entities';

export type CreateSeriesCommand = {
  clinicId: string;
  patientId: string;
  professionalId: string;
  roomId?: string | null;
  packageId?: string | null;
  /** 0=Dom ... 6=Sáb */
  weekdays: number[];
  startTime: string; // "08:00"
  durationMinutes: number;
  firstDate: string; // ISO date YYYY-MM-DD
  occurrences: number;
};

export type TransitionAppointmentCommand = {
  clinicId: string;
  appointmentId: string;
  status: AppointmentStatus;
  absenceKind?: AbsenceKind | null;
  absenceNotes?: string | null;
  /** Quando true e status NO_SHOW justificado, cria slot de reposição sugerido */
  scheduleMakeupAt?: Date | null;
};

export type ListAppointmentsQuery = {
  clinicId: string;
  from: Date;
  to: Date;
  professionalId?: string;
  patientId?: string;
};

export interface AppointmentUseCase {
  createSeries(cmd: CreateSeriesCommand): Promise<Result<Appointment[], Failure>>;
  list(query: ListAppointmentsQuery): Promise<Result<Appointment[], Failure>>;
  transition(cmd: TransitionAppointmentCommand): Promise<Result<Appointment, Failure>>;
  sendConfirmationReminders(clinicId: string, withinHours: number): Promise<Result<number, Failure>>;
}
