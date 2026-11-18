import type { User } from '../../entities';

export interface UserRepository {
  findById(clinicId: string, id: string): Promise<User | null>;
  findByEmail(clinicId: string, email: string): Promise<User | null>;
  findByEmailGlobal(email: string): Promise<User | null>;
  listByClinic(clinicId: string): Promise<User[]>;
  create(user: User): Promise<User>;
  update(user: User): Promise<User>;
}
