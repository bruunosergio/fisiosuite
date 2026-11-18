import type { Result } from '../../core/result';
import type { Failure } from '../../failures';
import type { AuthUser, Clinic } from '../../entities';
import type { ClinicPlatformSummary } from '../output';

export type PlatformLoginCommand = {
  email: string;
  password: string;
};

export type PlatformLoginResult = {
  accessToken: string;
  admin: {
    email: string;
    name: string;
    role: 'PLATFORM_ADMIN';
  };
};

export type PlatformClinicDetail = {
  summary: ClinicPlatformSummary;
  users: AuthUser[];
};

export type UpdateClinicPlatformCommand = {
  id: string;
  name?: string;
  phone?: string | null;
  document?: string | null;
  active?: boolean;
};

export interface PlatformUseCase {
  login(cmd: PlatformLoginCommand): Promise<Result<PlatformLoginResult, Failure>>;
  listClinics(): Promise<Result<ClinicPlatformSummary[], Failure>>;
  getClinic(id: string): Promise<Result<PlatformClinicDetail, Failure>>;
  updateClinic(cmd: UpdateClinicPlatformCommand): Promise<Result<Clinic, Failure>>;
  overview(): Promise<
    Result<
      {
        clinicCount: number;
        activeClinicCount: number;
        userCount: number;
        patientCount: number;
      },
      Failure
    >
  >;
}
