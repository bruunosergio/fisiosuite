import { Injectable } from '@nestjs/common';
import type { ClinicalRecord, SessionNote, SessionNoteHistoryItem } from '../../domain/entities';
import type { ClinicalRepository } from '../../domain/ports/output';
import { PrismaService } from '../database/prisma.service';
import { mapClinicalRecord, mapSessionNote } from '../mappers/domain.mappers';

@Injectable()
export class PrismaClinicalRepository implements ClinicalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createRecord(record: ClinicalRecord): Promise<ClinicalRecord> {
    const row = await this.prisma.clinicalRecord.create({
      data: {
        id: record.id,
        clinicId: record.clinicId,
        patientId: record.patientId,
        professionalId: record.professionalId,
        chiefComplaint: record.chiefComplaint,
        anamnesis: record.anamnesis,
        painMap: record.painMap ?? undefined,
        painScale: record.painScale,
        assessment: record.assessment,
        plan: record.plan,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
    });
    return mapClinicalRecord(row);
  }

  async listRecords(clinicId: string, patientId: string): Promise<ClinicalRecord[]> {
    const rows = await this.prisma.clinicalRecord.findMany({
      where: { clinicId, patientId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapClinicalRecord);
  }

  async findRecord(clinicId: string, id: string): Promise<ClinicalRecord | null> {
    const row = await this.prisma.clinicalRecord.findFirst({ where: { id, clinicId } });
    return row ? mapClinicalRecord(row) : null;
  }

  async upsertSessionNote(note: SessionNote): Promise<SessionNote> {
    const row = await this.prisma.sessionNote.upsert({
      where: { appointmentId: note.appointmentId },
      create: {
        id: note.id,
        appointmentId: note.appointmentId,
        professionalId: note.professionalId,
        subjective: note.subjective,
        objective: note.objective,
        assessment: note.assessment,
        plan: note.plan,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      },
      update: {
        subjective: note.subjective,
        objective: note.objective,
        assessment: note.assessment,
        plan: note.plan,
        updatedAt: note.updatedAt,
      },
    });
    return mapSessionNote(row);
  }

  async findSessionNoteByAppointment(appointmentId: string): Promise<SessionNote | null> {
    const row = await this.prisma.sessionNote.findUnique({ where: { appointmentId } });
    return row ? mapSessionNote(row) : null;
  }

  async listSessionNotesByPatient(
    clinicId: string,
    patientId: string,
  ): Promise<SessionNoteHistoryItem[]> {
    const rows = await this.prisma.sessionNote.findMany({
      where: {
        appointment: {
          clinicId,
          patientId,
        },
      },
      include: {
        appointment: {
          select: {
            patientId: true,
            startsAt: true,
            status: true,
          },
        },
      },
      orderBy: {
        appointment: {
          startsAt: 'desc',
        },
      },
    });

    return rows.map((row) => ({
      ...mapSessionNote(row),
      patientId: row.appointment.patientId,
      appointmentStartsAt: row.appointment.startsAt,
      appointmentStatus: row.appointment.status,
    }));
  }
}
