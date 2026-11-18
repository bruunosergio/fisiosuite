import { Injectable } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import type { Appointment } from '../../domain/entities';
import type {
  AppointmentFilters,
  AppointmentRepository,
} from '../../domain/ports/output';
import { PrismaService } from '../database/prisma.service';
import { mapAppointment } from '../mappers/domain.mappers';

@Injectable()
export class PrismaAppointmentRepository implements AppointmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(clinicId: string, id: string): Promise<Appointment | null> {
    const row = await this.prisma.appointment.findFirst({ where: { id, clinicId } });
    return row ? mapAppointment(row) : null;
  }

  async list(filters: AppointmentFilters): Promise<Appointment[]> {
    const rows = await this.prisma.appointment.findMany({
      where: {
        clinicId: filters.clinicId,
        startsAt: { gte: filters.from, lte: filters.to },
        ...(filters.professionalId ? { professionalId: filters.professionalId } : {}),
        ...(filters.patientId ? { patientId: filters.patientId } : {}),
        ...(filters.roomId ? { roomId: filters.roomId } : {}),
        status: { not: AppointmentStatus.CANCELLED },
      },
      orderBy: { startsAt: 'asc' },
    });
    return rows.map(mapAppointment);
  }

  async createMany(appointments: Appointment[]): Promise<Appointment[]> {
    await this.prisma.appointment.createMany({
      data: appointments.map((a) => ({
        id: a.id,
        clinicId: a.clinicId,
        patientId: a.patientId,
        professionalId: a.professionalId,
        roomId: a.roomId,
        packageId: a.packageId,
        startsAt: a.startsAt,
        endsAt: a.endsAt,
        status: a.status,
        seriesId: a.seriesId,
        makeupOfId: a.makeupOfId,
        absenceKind: a.absenceKind,
        absenceNotes: a.absenceNotes,
        packageDebited: a.packageDebited,
        confirmationSentAt: a.confirmationSentAt,
        confirmedAt: a.confirmedAt,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
    });
    const ids = appointments.map((a) => a.id);
    const rows = await this.prisma.appointment.findMany({
      where: { id: { in: ids } },
      orderBy: { startsAt: 'asc' },
    });
    return rows.map(mapAppointment);
  }

  async update(appointment: Appointment): Promise<Appointment> {
    const row = await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: appointment.status,
        absenceKind: appointment.absenceKind,
        absenceNotes: appointment.absenceNotes,
        packageDebited: appointment.packageDebited,
        confirmationSentAt: appointment.confirmationSentAt,
        confirmedAt: appointment.confirmedAt,
        startsAt: appointment.startsAt,
        endsAt: appointment.endsAt,
        roomId: appointment.roomId,
        packageId: appointment.packageId,
        updatedAt: appointment.updatedAt,
      },
    });
    return mapAppointment(row);
  }

  async findConflicts(params: {
    clinicId: string;
    professionalId: string;
    roomId: string | null;
    startsAt: Date;
    endsAt: Date;
    excludeId?: string;
  }): Promise<Appointment[]> {
    const overlap = {
      startsAt: { lt: params.endsAt },
      endsAt: { gt: params.startsAt },
      status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
      ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
    };

    const professionalConflicts = await this.prisma.appointment.findMany({
      where: {
        clinicId: params.clinicId,
        professionalId: params.professionalId,
        ...overlap,
      },
    });

    if (!params.roomId) {
      return professionalConflicts.map(mapAppointment);
    }

    const roomConflicts = await this.prisma.appointment.findMany({
      where: {
        clinicId: params.clinicId,
        roomId: params.roomId,
        ...overlap,
      },
    });

    const byId = new Map<string, Appointment>();
    for (const row of [...professionalConflicts, ...roomConflicts]) {
      byId.set(row.id, mapAppointment(row));
    }
    return [...byId.values()];
  }

  async listCompletedInPeriod(params: {
    clinicId: string;
    professionalId: string;
    from: Date;
    to: Date;
  }): Promise<Appointment[]> {
    const rows = await this.prisma.appointment.findMany({
      where: {
        clinicId: params.clinicId,
        professionalId: params.professionalId,
        startsAt: { gte: params.from, lte: params.to },
        status: { in: [AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW] },
      },
      orderBy: { startsAt: 'asc' },
    });
    return rows.map(mapAppointment);
  }
}
