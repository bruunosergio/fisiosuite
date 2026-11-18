import type { Room } from '../../entities';

export interface RoomRepository {
  findById(clinicId: string, id: string): Promise<Room | null>;
  list(clinicId: string): Promise<Room[]>;
  create(room: Room): Promise<Room>;
  update(room: Room): Promise<Room>;
}
