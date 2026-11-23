import { Result } from '../core/result';
import type { Failure } from '../failures';
import {
  ConflictFailure,
  InvalidCredentialsFailure,
  NotFoundFailure,
  ValidationFailure,
} from '../failures';
import { Role, Specialty, type AuthUser, type Clinic, type User } from '../entities';
import type {
  AuthUseCase,
  CreateUserCommand,
  LoginCommand,
  LoginResult,
  RegisterClinicCommand,
  UpdateUserCommand,
} from '../ports/input/auth.use-case';
import type {
  ClinicRepository,
  IdGeneratorPort,
  PasswordHasherPort,
  TokenPort,
  UserRepository,
} from '../ports/output';

function toAuthUser(user: User): AuthUser {
  const { passwordHash: _, ...rest } = user;
  return rest;
}

/** Returns the normalized UF, null when empty, or undefined when invalid. */
function normalizeCouncilState(value: string | null | undefined): string | null | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return /^[A-Za-z]{2}$/.test(trimmed) ? trimmed.toUpperCase() : undefined;
}

export class AuthUseCaseImpl implements AuthUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly clinics: ClinicRepository,
    private readonly hasher: PasswordHasherPort,
    private readonly tokens: TokenPort,
    private readonly ids: IdGeneratorPort,
  ) {}

  async login(cmd: LoginCommand): Promise<Result<LoginResult, Failure>> {
    const email = cmd.email.trim().toLowerCase();
    if (!email || !cmd.password) {
      return Result.error(new ValidationFailure('E-mail e senha são obrigatórios.'));
    }

    const user = await this.users.findByEmailGlobal(email);
    if (!user || !user.active) {
      return Result.error(new InvalidCredentialsFailure());
    }

    const clinic = await this.clinics.findById(user.clinicId);
    if (!clinic || !clinic.active) {
      return Result.error(
        new InvalidCredentialsFailure('Esta clínica está inativa. Fale com o suporte FisioSuite.'),
      );
    }

    const ok = await this.hasher.compare(cmd.password, user.passwordHash);
    if (!ok) {
      return Result.error(new InvalidCredentialsFailure());
    }

    const accessToken = await this.tokens.sign({
      sub: user.id,
      clinicId: user.clinicId,
      role: user.role,
      email: user.email,
      name: user.name,
      scope: 'clinic',
    });

    return Result.ok({
      accessToken,
      user: toAuthUser(user),
      enabledModules: clinic.enabledModules,
    });
  }

  async registerClinic(cmd: RegisterClinicCommand): Promise<Result<LoginResult, Failure>> {
    if (!cmd.clinicName?.trim()) {
      return Result.error(new ValidationFailure('Nome da clínica é obrigatório.'));
    }
    if (!cmd.adminEmail?.trim() || !cmd.adminPassword || cmd.adminPassword.length < 8) {
      return Result.error(
        new ValidationFailure('Informe e-mail do admin e senha com pelo menos 8 caracteres.'),
      );
    }

    const email = cmd.adminEmail.trim().toLowerCase();
    const existing = await this.users.findByEmailGlobal(email);
    if (existing) {
      return Result.error(new ConflictFailure('Já existe um usuário com este e-mail.'));
    }

    const enabledModules = cmd.enabledModules?.length
      ? [...new Set(cmd.enabledModules)]
      : [Specialty.FISIOTERAPIA];

    const now = new Date();
    const clinicId = this.ids.generate();
    const clinic: Clinic = {
      id: clinicId,
      name: cmd.clinicName.trim(),
      document: null,
      phone: cmd.phone?.trim() || null,
      timezone: 'America/Sao_Paulo',
      absenceNoticeHours: 24,
      justifiedDebitsPackage: false,
      unjustifiedDebitsPackage: true,
      commissionOnNoShow: false,
      commissionOnMakeup: false,
      enabledModules,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    await this.clinics.create(clinic);

    const passwordHash = await this.hasher.hash(cmd.adminPassword);
    const user: User = {
      id: this.ids.generate(),
      clinicId,
      name: cmd.adminName.trim(),
      email,
      passwordHash,
      role: Role.ADMIN,
      commissionPct: null,
      specialty: null,
      councilType: null,
      councilNumber: null,
      councilState: null,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    await this.users.create(user);

    const accessToken = await this.tokens.sign({
      sub: user.id,
      clinicId,
      role: user.role,
      email: user.email,
      name: user.name,
    });

    return Result.ok({
      accessToken,
      user: toAuthUser(user),
      enabledModules: clinic.enabledModules,
    });
  }

  async createUser(cmd: CreateUserCommand): Promise<Result<AuthUser, Failure>> {
    const email = cmd.email.trim().toLowerCase();
    if (!email || !cmd.password || cmd.password.length < 8) {
      return Result.error(new ValidationFailure('E-mail e senha (mín. 8) são obrigatórios.'));
    }
    const councilState = normalizeCouncilState(cmd.councilState);
    if (councilState === undefined) {
      return Result.error(new ValidationFailure('UF do conselho deve ter 2 letras.'));
    }
    const existing = await this.users.findByEmail(cmd.clinicId, email);
    if (existing) {
      return Result.error(new ConflictFailure('E-mail já cadastrado nesta clínica.'));
    }

    const now = new Date();
    const user: User = {
      id: this.ids.generate(),
      clinicId: cmd.clinicId,
      name: cmd.name.trim(),
      email,
      passwordHash: await this.hasher.hash(cmd.password),
      role: cmd.role,
      commissionPct: cmd.commissionPct ?? null,
      specialty: cmd.specialty ?? null,
      councilType: cmd.councilType ?? null,
      councilNumber: cmd.councilNumber?.trim() || null,
      councilState,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    await this.users.create(user);
    return Result.ok(toAuthUser(user));
  }

  async updateUser(cmd: UpdateUserCommand): Promise<Result<AuthUser, Failure>> {
    const existing = await this.users.findById(cmd.clinicId, cmd.id);
    if (!existing) return Result.error(new NotFoundFailure('Usuário', cmd.id));

    const email = cmd.email.trim().toLowerCase();
    if (!cmd.name?.trim() || !email) {
      return Result.error(new ValidationFailure('Nome e e-mail são obrigatórios.'));
    }
    if (cmd.password != null && cmd.password !== '' && cmd.password.length < 8) {
      return Result.error(new ValidationFailure('Nova senha precisa ter pelo menos 8 caracteres.'));
    }

    if (email !== existing.email) {
      const conflict = await this.users.findByEmail(cmd.clinicId, email);
      if (conflict && conflict.id !== existing.id) {
        return Result.error(new ConflictFailure('E-mail já cadastrado nesta clínica.'));
      }
      const globalConflict = await this.users.findByEmailGlobal(email);
      if (globalConflict && globalConflict.id !== existing.id) {
        return Result.error(new ConflictFailure('Já existe um usuário com este e-mail.'));
      }
    }

    const councilState =
      cmd.councilState === undefined
        ? existing.councilState
        : normalizeCouncilState(cmd.councilState);
    if (councilState === undefined) {
      return Result.error(new ValidationFailure('UF do conselho deve ter 2 letras.'));
    }

    const passwordHash =
      cmd.password && cmd.password.length >= 8
        ? await this.hasher.hash(cmd.password)
        : existing.passwordHash;

    const updated: User = {
      ...existing,
      name: cmd.name.trim(),
      email,
      role: cmd.role,
      commissionPct:
        cmd.role === Role.PROFESSIONAL
          ? cmd.commissionPct === undefined
            ? existing.commissionPct
            : cmd.commissionPct
          : null,
      specialty: cmd.specialty !== undefined ? cmd.specialty : existing.specialty,
      councilType: cmd.councilType !== undefined ? cmd.councilType : existing.councilType,
      councilNumber:
        cmd.councilNumber !== undefined ? cmd.councilNumber?.trim() || null : existing.councilNumber,
      councilState,
      active: cmd.active !== undefined ? cmd.active : existing.active,
      passwordHash,
      updatedAt: new Date(),
    };

    return Result.ok(toAuthUser(await this.users.update(updated)));
  }

  async listUsers(clinicId: string): Promise<Result<AuthUser[], Failure>> {
    const users = await this.users.listByClinic(clinicId);
    return Result.ok(users.map(toAuthUser));
  }
}
