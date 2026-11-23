import { CouncilType, Role, Specialty } from './enums';

export type User = {
  id: string;
  clinicId: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  commissionPct: number | null;
  specialty: Specialty | null;
  councilType: CouncilType | null;
  councilNumber: string | null;
  councilState: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type AuthUser = Omit<User, 'passwordHash'>;
