import { Role } from './enums';

export type User = {
  id: string;
  clinicId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  commissionPct: number | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type AuthUser = Omit<User, 'passwordHash'>;
