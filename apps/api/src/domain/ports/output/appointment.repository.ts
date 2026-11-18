import type { Appointment } from '../../entities';

export type AppointmentFilters = {
  clinicId: string;
  from: Date;
  to: Date;
  professionalId?: string;
  patientId?: string;
  roomId?: string;
};

export interface AppointmentRepository {
  findById(clinicId: string, id: string): Promise<Appointment | null>;
  list(filters: AppointmentFilters): Promise<Appointment[]>;
  createMany(appointments: Appointment[]): Promise<Appointment[]>;
  update(appointment: Appointment): Promise<Appointment>;
  findConflicts(params: {
    clinicId: string;
    professionalId: string;
    roomId: string | null;
    startsAt: Date;
    endsAt: Date;
    excludeId?: string;
  }): Promise<Appointment[]>;
  listCompletedInPeriod(params: {
    clinicId: string;
    professionalId: string;
    from: Date;
    to: Date;
  }): Promise<Appointment[]>;
}
