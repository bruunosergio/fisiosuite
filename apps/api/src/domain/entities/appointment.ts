import { AbsenceKind, AppointmentStatus } from './enums';

export type Appointment = {
  id: string;
  clinicId: string;
  patientId: string;
  professionalId: string;
  roomId: string | null;
  packageId: string | null;
  startsAt: Date;
  endsAt: Date;
  status: AppointmentStatus;
  seriesId: string | null;
  makeupOfId: string | null;
  absenceKind: AbsenceKind | null;
  absenceNotes: string | null;
  packageDebited: boolean;
  confirmationSentAt: Date | null;
  confirmedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
