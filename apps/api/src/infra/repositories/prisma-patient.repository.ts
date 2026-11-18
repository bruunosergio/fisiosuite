import { Injectable } from '@nestjs/common';
import type { Patient } from '../../domain/entities';
import type { PatientRepository } from '../../domain/ports/output';
import { PrismaService } from '../database/prisma.service';
import { mapPatient } from '../mappers/domain.mappers';

@Injectable()
export class PrismaPatientRepository implements PatientRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(clinicId: string, id: string): Promise<Patient | null> {
    const row = await this.prisma.patient.findFirst({ where: { id, clinicId } });
    return row ? mapPatient(row) : null;
  }

  async search(clinicId: string, query: string): Promise<Patient[]> {
    const q = query.trim();
    const rows = await this.prisma.patient.findMany({
      where: {
        clinicId,
        active: true,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
          { whatsapp: { contains: q } },
          { cpf: { contains: q } },
        ],
      },
      orderBy: { name: 'asc' },
      take: 50,
    });
    return rows.map(mapPatient);
  }

  async list(clinicId: string): Promise<Patient[]> {
    const rows = await this.prisma.patient.findMany({
      where: { clinicId },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });
    return rows.map(mapPatient);
  }

  async create(patient: Patient): Promise<Patient> {
    const row = await this.prisma.patient.create({
      data: {
        id: patient.id,
        clinicId: patient.clinicId,
        name: patient.name,
        phone: patient.phone,
        whatsapp: patient.whatsapp,
        email: patient.email,
        cpf: patient.cpf,
        birthDate: patient.birthDate,
        notes: patient.notes,
        active: patient.active,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt,
      },
    });
    return mapPatient(row);
  }

  async update(patient: Patient): Promise<Patient> {
    const row = await this.prisma.patient.update({
      where: { id: patient.id },
      data: {
        name: patient.name,
        phone: patient.phone,
        whatsapp: patient.whatsapp,
        email: patient.email,
        cpf: patient.cpf,
        birthDate: patient.birthDate,
        notes: patient.notes,
        active: patient.active,
        updatedAt: patient.updatedAt,
      },
    });
    return mapPatient(row);
  }
}
