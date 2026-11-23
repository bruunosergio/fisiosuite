import type { Result } from '../../core/result';
import type { Failure } from '../../failures';
import type { AuthUser, CouncilType, Role, Specialty } from '../../entities';

export type LoginCommand = { email: string; password: string };

export type LoginResult = {
  accessToken: string;
  user: AuthUser;
  enabledModules: Specialty[];
};

export type RegisterClinicCommand = {
  clinicName: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  phone?: string;
  enabledModules?: Specialty[];
};

export type CreateUserCommand = {
  clinicId: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  commissionPct?: number | null;
  specialty?: Specialty | null;
  councilType?: CouncilType | null;
  councilNumber?: string | null;
  councilState?: string | null;
};

export type UpdateUserCommand = {
  clinicId: string;
  id: string;
  name: string;
  email: string;
  role: Role;
  commissionPct?: number | null;
  specialty?: Specialty | null;
  councilType?: CouncilType | null;
  councilNumber?: string | null;
  councilState?: string | null;
  active?: boolean;
  password?: string | null;
};

export interface AuthUseCase {
  login(cmd: LoginCommand): Promise<Result<LoginResult, Failure>>;
  registerClinic(cmd: RegisterClinicCommand): Promise<Result<LoginResult, Failure>>;
  createUser(cmd: CreateUserCommand): Promise<Result<AuthUser, Failure>>;
  updateUser(cmd: UpdateUserCommand): Promise<Result<AuthUser, Failure>>;
  listUsers(clinicId: string): Promise<Result<AuthUser[], Failure>>;
}
