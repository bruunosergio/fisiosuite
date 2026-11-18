import type { Result } from '../../core/result';
import type { Failure } from '../../failures';
import type { Room } from '../../entities';

export interface RoomUseCase {
  create(cmd: {
    clinicId: string;
    name: string;
    capacity?: number;
  }): Promise<Result<Room, Failure>>;
  list(clinicId: string): Promise<Result<Room[], Failure>>;
}
