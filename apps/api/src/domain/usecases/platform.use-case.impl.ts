import { Result } from '../core/result';
import type { Failure } from '../failures';
import {
  InvalidCredentialsFailure,
  NotFoundFailure,
  ValidationFailure,
} from '../failures';
import type { AuthUser, Clinic, User } from '../entities';
import type {
  PlatformLoginCommand,
  PlatformLoginResult,
  PlatformUseCase,
  UpdateClinicPlatformCommand,
} from '../ports/input/platform.use-case';
import type {
  ClinicPlatformSummary,
  ClinicRepository,
  TokenPort,
  UserRepository,
} from '../ports/output';

export type PlatformAdminCredentials = {
  email: string;
  password: string;
  name: string;
};

function toAuthUser(user: User): AuthUser {
  const { passwordHash: _, ...rest } = user;
  return rest;
}

export class PlatformUseCaseImpl implements PlatformUseCase {
  constructor(
    private readonly clinics: ClinicRepository,
    private readonly users: UserRepository,
    private readonly tokens: TokenPort,
    private readonly credentials: PlatformAdminCredentials | null,
  ) {}

  async login(cmd: PlatformLoginCommand): Promise<Result<PlatformLoginResult, Failure>> {
    if (!this.credentials) {
      return Result.error(
        new ValidationFailure(
          'Painel da plataforma não configurado. Defina PLATFORM_ADMIN_EMAIL e PLATFORM_ADMIN_PASSWORD.',
        ),
      );
    }

    const email = cmd.email.trim().toLowerCase();
    if (!email || !cmd.password) {
      return Result.error(new ValidationFailure('E-mail e senha são obrigatórios.'));
    }

    if (
      email !== this.credentials.email.toLowerCase() ||
      cmd.password !== this.credentials.password
    ) {
      return Result.error(new InvalidCredentialsFailure());
    }

    const accessToken = await this.tokens.sign({
      sub: 'platform-admin',
      clinicId: '*',
      role: 'PLATFORM_ADMIN',
      email: this.credentials.email,
      name: this.credentials.name,
      scope: 'platform',
    });

    return Result.ok({
      accessToken,
      admin: {
        email: this.credentials.email,
        name: this.credentials.name,
        role: 'PLATFORM_ADMIN',
      },
    });
  }

  async listClinics(): Promise<Result<ClinicPlatformSummary[], Failure>> {
    return Result.ok(await this.clinics.listPlatformSummaries());
  }

  async getClinic(id: string): Promise<Result<{ summary: ClinicPlatformSummary; users: AuthUser[] }, Failure>> {
    const summaries = await this.clinics.listPlatformSummaries();
    const summary = summaries.find((s) => s.clinic.id === id);
    if (!summary) return Result.error(new NotFoundFailure('Clínica', id));

    const users = await this.users.listByClinic(id);
    return Result.ok({
      summary,
      users: users.map(toAuthUser),
    });
  }

  async updateClinic(cmd: UpdateClinicPlatformCommand): Promise<Result<Clinic, Failure>> {
    const existing = await this.clinics.findById(cmd.id);
    if (!existing) return Result.error(new NotFoundFailure('Clínica', cmd.id));

    if (cmd.name !== undefined && !cmd.name.trim()) {
      return Result.error(new ValidationFailure('Nome da clínica é obrigatório.'));
    }

    const updated: Clinic = {
      ...existing,
      name: cmd.name !== undefined ? cmd.name.trim() : existing.name,
      phone: cmd.phone !== undefined ? cmd.phone : existing.phone,
      document: cmd.document !== undefined ? cmd.document : existing.document,
      active: cmd.active !== undefined ? cmd.active : existing.active,
      updatedAt: new Date(),
    };

    return Result.ok(await this.clinics.update(updated));
  }

  async overview(): Promise<
    Result<
      {
        clinicCount: number;
        activeClinicCount: number;
        userCount: number;
        patientCount: number;
      },
      Failure
    >
  > {
    const summaries = await this.clinics.listPlatformSummaries();
    return Result.ok({
      clinicCount: summaries.length,
      activeClinicCount: summaries.filter((s) => s.clinic.active).length,
      userCount: summaries.reduce((acc, s) => acc + s.userCount, 0),
      patientCount: summaries.reduce((acc, s) => acc + s.patientCount, 0),
    });
  }
}
