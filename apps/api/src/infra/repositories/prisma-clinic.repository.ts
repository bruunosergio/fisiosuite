import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Clinic } from '../../domain/entities';
import type { ClinicPlatformSummary, ClinicRepository } from '../../domain/ports/output';
import { PrismaService } from '../database/prisma.service';
import { mapClinic } from '../mappers/domain.mappers';

@Injectable()
export class PrismaClinicRepository implements ClinicRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Clinic | null> {
    const row = await this.prisma.clinic.findUnique({ where: { id } });
    return row ? mapClinic(row) : null;
  }

  async listAll(): Promise<Clinic[]> {
    const rows = await this.prisma.clinic.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map(mapClinic);
  }

  async listPlatformSummaries(): Promise<ClinicPlatformSummary[]> {
    const rows = await this.prisma.clinic.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            users: true,
            patients: true,
            appointments: true,
          },
        },
        users: {
          where: { role: Role.ADMIN },
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { email: true },
        },
      },
    });

    return rows.map((row) => ({
      clinic: mapClinic(row),
      userCount: row._count.users,
      patientCount: row._count.patients,
      appointmentCount: row._count.appointments,
      adminEmail: row.users[0]?.email ?? null,
    }));
  }

  async create(clinic: Clinic): Promise<Clinic> {
    const row = await this.prisma.clinic.create({
      data: {
        id: clinic.id,
        name: clinic.name,
        document: clinic.document,
        phone: clinic.phone,
        timezone: clinic.timezone,
        absenceNoticeHours: clinic.absenceNoticeHours,
        justifiedDebitsPackage: clinic.justifiedDebitsPackage,
        unjustifiedDebitsPackage: clinic.unjustifiedDebitsPackage,
        commissionOnNoShow: clinic.commissionOnNoShow,
        commissionOnMakeup: clinic.commissionOnMakeup,
        active: clinic.active,
        createdAt: clinic.createdAt,
        updatedAt: clinic.updatedAt,
      },
    });
    return mapClinic(row);
  }

  async update(clinic: Clinic): Promise<Clinic> {
    const row = await this.prisma.clinic.update({
      where: { id: clinic.id },
      data: {
        name: clinic.name,
        document: clinic.document,
        phone: clinic.phone,
        absenceNoticeHours: clinic.absenceNoticeHours,
        justifiedDebitsPackage: clinic.justifiedDebitsPackage,
        unjustifiedDebitsPackage: clinic.unjustifiedDebitsPackage,
        commissionOnNoShow: clinic.commissionOnNoShow,
        commissionOnMakeup: clinic.commissionOnMakeup,
        active: clinic.active,
        updatedAt: clinic.updatedAt,
      },
    });
    return mapClinic(row);
  }
}
