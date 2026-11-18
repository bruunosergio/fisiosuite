import { Injectable } from '@nestjs/common';
import type { User } from '../../domain/entities';
import type { UserRepository } from '../../domain/ports/output';
import { PrismaService } from '../database/prisma.service';
import { mapUser } from '../mappers/domain.mappers';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(clinicId: string, id: string): Promise<User | null> {
    const row = await this.prisma.user.findFirst({ where: { id, clinicId } });
    return row ? mapUser(row) : null;
  }

  async findByEmail(clinicId: string, email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({
      where: { clinicId_email: { clinicId, email } },
    });
    return row ? mapUser(row) : null;
  }

  async findByEmailGlobal(email: string): Promise<User | null> {
    const row = await this.prisma.user.findFirst({ where: { email } });
    return row ? mapUser(row) : null;
  }

  async listByClinic(clinicId: string): Promise<User[]> {
    const rows = await this.prisma.user.findMany({
      where: { clinicId },
      orderBy: { name: 'asc' },
    });
    return rows.map(mapUser);
  }

  async create(user: User): Promise<User> {
    const row = await this.prisma.user.create({
      data: {
        id: user.id,
        clinicId: user.clinicId,
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
        role: user.role,
        commissionPct: user.commissionPct,
        active: user.active,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
    return mapUser(row);
  }

  async update(user: User): Promise<User> {
    const row = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
        role: user.role,
        commissionPct: user.commissionPct,
        active: user.active,
        updatedAt: user.updatedAt,
      },
    });
    return mapUser(row);
  }
}
