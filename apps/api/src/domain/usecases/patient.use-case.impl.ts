import { Result } from '../core/result';
import type { Failure } from '../failures';
import { NotFoundFailure, ValidationFailure } from '../failures';
import type { Patient } from '../entities';
import type { PatientUseCase, UpsertPatientCommand } from '../ports/input/patient.use-case';
import type { IdGeneratorPort, PatientRepository } from '../ports/output';

export class PatientUseCaseImpl implements PatientUseCase {
  constructor(
    private readonly patients: PatientRepository,
    private readonly ids: IdGeneratorPort,
  ) {}

  async create(cmd: UpsertPatientCommand): Promise<Result<Patient, Failure>> {
    if (!cmd.name?.trim()) {
      return Result.error(new ValidationFailure('Nome do paciente é obrigatório.'));
    }
    const now = new Date();
    const patient: Patient = {
      id: this.ids.generate(),
      clinicId: cmd.clinicId,
      name: cmd.name.trim(),
      phone: cmd.phone ?? null,
      whatsapp: cmd.whatsapp ?? cmd.phone ?? null,
      email: cmd.email ?? null,
      cpf: cmd.cpf ?? null,
      birthDate: cmd.birthDate ?? null,
      biologicalSex: cmd.biologicalSex ?? null,
      allergiesSummary: cmd.allergiesSummary ?? null,
      dietaryRestrictions: cmd.dietaryRestrictions ?? null,
      notes: cmd.notes ?? null,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    return Result.ok(await this.patients.create(patient));
  }

  async update(cmd: UpsertPatientCommand & { id: string }): Promise<Result<Patient, Failure>> {
    const existing = await this.patients.findById(cmd.clinicId, cmd.id);
    if (!existing) {
      return Result.error(new NotFoundFailure('Paciente', cmd.id));
    }
    if (!cmd.name?.trim()) {
      return Result.error(new ValidationFailure('Nome do paciente é obrigatório.'));
    }
    const updated: Patient = {
      ...existing,
      name: cmd.name.trim(),
      phone: cmd.phone !== undefined ? cmd.phone : existing.phone,
      whatsapp: cmd.whatsapp !== undefined ? cmd.whatsapp : existing.whatsapp,
      email: cmd.email !== undefined ? cmd.email : existing.email,
      cpf: cmd.cpf !== undefined ? cmd.cpf : existing.cpf,
      birthDate: cmd.birthDate === undefined ? existing.birthDate : cmd.birthDate,
      biologicalSex:
        cmd.biologicalSex !== undefined ? cmd.biologicalSex : existing.biologicalSex,
      allergiesSummary:
        cmd.allergiesSummary !== undefined ? cmd.allergiesSummary : existing.allergiesSummary,
      dietaryRestrictions:
        cmd.dietaryRestrictions !== undefined
          ? cmd.dietaryRestrictions
          : existing.dietaryRestrictions,
      notes: cmd.notes !== undefined ? cmd.notes : existing.notes,
      active: cmd.active !== undefined ? cmd.active : existing.active,
      updatedAt: new Date(),
    };
    return Result.ok(await this.patients.update(updated));
  }

  async list(clinicId: string): Promise<Result<Patient[], Failure>> {
    return Result.ok(await this.patients.list(clinicId));
  }

  async search(clinicId: string, query: string): Promise<Result<Patient[], Failure>> {
    return Result.ok(await this.patients.search(clinicId, query));
  }

  async getById(clinicId: string, id: string): Promise<Result<Patient, Failure>> {
    const patient = await this.patients.findById(clinicId, id);
    if (!patient) return Result.error(new NotFoundFailure('Paciente', id));
    return Result.ok(patient);
  }
}
