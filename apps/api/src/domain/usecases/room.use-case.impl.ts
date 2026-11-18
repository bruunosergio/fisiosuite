import { Result } from '../core/result';
import type { Failure } from '../failures';
import { ValidationFailure } from '../failures';
import type { Room } from '../entities';
import type { RoomUseCase } from '../ports/input/room.use-case';
import type { IdGeneratorPort, RoomRepository } from '../ports/output';

export class RoomUseCaseImpl implements RoomUseCase {
  constructor(
    private readonly rooms: RoomRepository,
    private readonly ids: IdGeneratorPort,
  ) {}

  async create(cmd: {
    clinicId: string;
    name: string;
    capacity?: number;
  }): Promise<Result<Room, Failure>> {
    if (!cmd.name?.trim()) {
      return Result.error(new ValidationFailure('Nome da sala é obrigatório.'));
    }
    const room: Room = {
      id: this.ids.generate(),
      clinicId: cmd.clinicId,
      name: cmd.name.trim(),
      capacity: cmd.capacity && cmd.capacity > 0 ? cmd.capacity : 1,
      active: true,
      createdAt: new Date(),
    };
    return Result.ok(await this.rooms.create(room));
  }

  async list(clinicId: string): Promise<Result<Room[], Failure>> {
    return Result.ok(await this.rooms.list(clinicId));
  }
}
