import { Injectable } from '@nestjs/common';
import type { Room } from '../../domain/entities';
import type { RoomRepository } from '../../domain/ports/output';
import { PrismaService } from '../database/prisma.service';
import { mapRoom } from '../mappers/domain.mappers';

@Injectable()
export class PrismaRoomRepository implements RoomRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(clinicId: string, id: string): Promise<Room | null> {
    const row = await this.prisma.room.findFirst({ where: { id, clinicId } });
    return row ? mapRoom(row) : null;
  }

  async list(clinicId: string): Promise<Room[]> {
    const rows = await this.prisma.room.findMany({
      where: { clinicId, active: true },
      orderBy: { name: 'asc' },
    });
    return rows.map(mapRoom);
  }

  async create(room: Room): Promise<Room> {
    const row = await this.prisma.room.create({
      data: {
        id: room.id,
        clinicId: room.clinicId,
        name: room.name,
        capacity: room.capacity,
        active: room.active,
        createdAt: room.createdAt,
      },
    });
    return mapRoom(row);
  }

  async update(room: Room): Promise<Room> {
    const row = await this.prisma.room.update({
      where: { id: room.id },
      data: {
        name: room.name,
        capacity: room.capacity,
        active: room.active,
      },
    });
    return mapRoom(row);
  }
}
