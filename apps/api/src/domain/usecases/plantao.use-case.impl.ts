import { Result } from '../core/result';
import type { Failure } from '../failures';
import { NotFoundFailure, ValidationFailure } from '../failures';
import {
  AdmissionStatus,
  BedStatus,
  CensusItemStatus,
  CensusPriority,
  ShiftStatus,
  type Admission,
  type AdmissionDetail,
  type Bed,
  type CensusItem,
  type CensusItemDetail,
  type Handoff,
  type HandoffSummary,
  type HospitalSite,
  type HospitalSiteDetail,
  type PlantaoEncounter,
  type Shift,
  type ShiftDetail,
  type Ward,
} from '../entities';
import type {
  AdmitPatientCommand,
  CloseShiftHandoffCommand,
  CreateBedCommand,
  CreateEncounterCommand,
  CreateHospitalSiteCommand,
  CreateWardCommand,
  DischargeCommand,
  OpenShiftCommand,
  PlantaoUseCase,
  TransferBedCommand,
  UpdateAdmissionCommand,
  UpdateCensusItemCommand,
} from '../ports/input/plantao.use-case';
import type {
  IdGeneratorPort,
  PatientRepository,
  PlantaoRepository,
  UserRepository,
} from '../ports/output';

export class PlantaoUseCaseImpl implements PlantaoUseCase {
  constructor(
    private readonly plantao: PlantaoRepository,
    private readonly patients: PatientRepository,
    private readonly users: UserRepository,
    private readonly ids: IdGeneratorPort,
  ) {}

  async createHospitalSite(
    cmd: CreateHospitalSiteCommand,
  ): Promise<Result<HospitalSite, Failure>> {
    if (!cmd.name?.trim()) {
      return Result.error(new ValidationFailure('Nome do hospital é obrigatório.'));
    }
    const site: HospitalSite = {
      id: this.ids.generate(),
      clinicId: cmd.clinicId,
      name: cmd.name.trim(),
      city: cmd.city?.trim() || null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return Result.ok(await this.plantao.createHospitalSite(site));
  }

  async listHospitalSites(clinicId: string): Promise<Result<HospitalSiteDetail[], Failure>> {
    return Result.ok(await this.plantao.listHospitalSites(clinicId));
  }

  async createWard(cmd: CreateWardCommand): Promise<Result<Ward, Failure>> {
    if (!cmd.name?.trim()) {
      return Result.error(new ValidationFailure('Nome do setor é obrigatório.'));
    }
    const site = await this.plantao.findHospitalSite(cmd.clinicId, cmd.hospitalSiteId);
    if (!site) return Result.error(new NotFoundFailure('Hospital', cmd.hospitalSiteId));
    const ward: Ward = {
      id: this.ids.generate(),
      hospitalSiteId: cmd.hospitalSiteId,
      name: cmd.name.trim(),
      active: true,
      createdAt: new Date(),
    };
    return Result.ok(await this.plantao.createWard(ward));
  }

  async createBed(cmd: CreateBedCommand): Promise<Result<Bed, Failure>> {
    if (!cmd.code?.trim()) {
      return Result.error(new ValidationFailure('Código do leito é obrigatório.'));
    }
    const sites = await this.plantao.listHospitalSites(cmd.clinicId);
    const ward = sites.flatMap((s) => s.wards).find((w) => w.id === cmd.wardId);
    if (!ward) return Result.error(new NotFoundFailure('Setor', cmd.wardId));
    const bed: Bed = {
      id: this.ids.generate(),
      wardId: cmd.wardId,
      code: cmd.code.trim(),
      status: BedStatus.FREE,
      active: true,
      createdAt: new Date(),
    };
    return Result.ok(await this.plantao.createBed(bed));
  }

  async listFreeBeds(
    clinicId: string,
    hospitalSiteId: string,
    wardId?: string,
  ): Promise<Result<Bed[], Failure>> {
    const site = await this.plantao.findHospitalSite(clinicId, hospitalSiteId);
    if (!site) return Result.error(new NotFoundFailure('Hospital', hospitalSiteId));
    return Result.ok(await this.plantao.listFreeBeds(clinicId, hospitalSiteId, wardId));
  }

  async admit(cmd: AdmitPatientCommand): Promise<Result<AdmissionDetail, Failure>> {
    const patient = await this.patients.findById(cmd.clinicId, cmd.patientId);
    if (!patient) return Result.error(new NotFoundFailure('Paciente', cmd.patientId));

    const site = await this.plantao.findHospitalSite(cmd.clinicId, cmd.hospitalSiteId);
    if (!site) return Result.error(new NotFoundFailure('Hospital', cmd.hospitalSiteId));

    const bed = await this.plantao.findBed(cmd.clinicId, cmd.bedId);
    if (!bed) return Result.error(new NotFoundFailure('Leito', cmd.bedId));
    if (bed.hospitalSiteId !== cmd.hospitalSiteId) {
      return Result.error(new ValidationFailure('Leito não pertence a este hospital.'));
    }
    if (bed.status !== BedStatus.FREE) {
      return Result.error(new ValidationFailure('Leito não está livre.'));
    }

    const admission: Admission = {
      id: this.ids.generate(),
      clinicId: cmd.clinicId,
      patientId: cmd.patientId,
      hospitalSiteId: cmd.hospitalSiteId,
      bedId: cmd.bedId,
      hospitalMrn: cmd.hospitalMrn?.trim() || null,
      insuranceName: cmd.insuranceName?.trim() || null,
      admittedAt: cmd.admittedAt ?? new Date(),
      reason: cmd.reason?.trim() || null,
      diagnosis: cmd.diagnosis?.trim() || null,
      responsiblePhysician: cmd.responsiblePhysician?.trim() || null,
      expectedDischargeAt: cmd.expectedDischargeAt ?? null,
      precautions: cmd.precautions ?? null,
      mobilityLevel: cmd.mobilityLevel?.trim() || null,
      assistanceNeeded: cmd.assistanceNeeded?.trim() || null,
      initialGoals: cmd.initialGoals?.trim() || null,
      openPending: null,
      status: AdmissionStatus.ACTIVE,
      dischargedAt: null,
      dischargeDestination: null,
      dischargeSummary: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.plantao.createAdmission(admission);
    await this.plantao.updateBedStatus(cmd.bedId, BedStatus.OCCUPIED);

    const openShift = await this.plantao.findOpenShift(cmd.clinicId, cmd.hospitalSiteId);
    if (openShift) {
      const covered =
        openShift.wardIds.length === 0 || openShift.wardIds.includes(bed.wardId);
      if (covered) {
        await this.plantao.createCensusItems([
          {
            id: this.ids.generate(),
            shiftId: openShift.id,
            admissionId: admission.id,
            priority: CensusPriority.STABLE,
            status: CensusItemStatus.PENDING,
            notes: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]);
      }
    }

    const detail = await this.plantao.findAdmission(cmd.clinicId, admission.id);
    if (!detail) return Result.error(new NotFoundFailure('Internação', admission.id));
    return Result.ok(detail);
  }

  async transferBed(cmd: TransferBedCommand): Promise<Result<AdmissionDetail, Failure>> {
    const current = await this.plantao.findAdmission(cmd.clinicId, cmd.admissionId);
    if (!current) return Result.error(new NotFoundFailure('Internação', cmd.admissionId));
    if (current.status !== AdmissionStatus.ACTIVE) {
      return Result.error(new ValidationFailure('Só é possível transferir internação ativa.'));
    }

    const newBed = await this.plantao.findBed(cmd.clinicId, cmd.bedId);
    if (!newBed) return Result.error(new NotFoundFailure('Leito', cmd.bedId));
    if (newBed.hospitalSiteId !== current.hospitalSiteId) {
      return Result.error(new ValidationFailure('Transferência deve ser no mesmo hospital.'));
    }
    if (newBed.status !== BedStatus.FREE && newBed.id !== current.bedId) {
      return Result.error(new ValidationFailure('Leito de destino não está livre.'));
    }

    if (current.bedId !== cmd.bedId) {
      await this.plantao.markBedFree(current.bedId);
      await this.plantao.updateBedStatus(cmd.bedId, BedStatus.OCCUPIED);
    }

    await this.plantao.updateAdmission({
      ...current,
      bedId: cmd.bedId,
      updatedAt: new Date(),
    });
    const detail = await this.plantao.findAdmission(cmd.clinicId, cmd.admissionId);
    if (!detail) return Result.error(new NotFoundFailure('Internação', cmd.admissionId));
    return Result.ok(detail);
  }

  async updateAdmission(cmd: UpdateAdmissionCommand): Promise<Result<AdmissionDetail, Failure>> {
    const current = await this.plantao.findAdmission(cmd.clinicId, cmd.admissionId);
    if (!current) return Result.error(new NotFoundFailure('Internação', cmd.admissionId));

    await this.plantao.updateAdmission({
      ...current,
      hospitalMrn: cmd.hospitalMrn !== undefined ? cmd.hospitalMrn?.trim() || null : current.hospitalMrn,
      insuranceName:
        cmd.insuranceName !== undefined ? cmd.insuranceName?.trim() || null : current.insuranceName,
      reason: cmd.reason !== undefined ? cmd.reason?.trim() || null : current.reason,
      diagnosis: cmd.diagnosis !== undefined ? cmd.diagnosis?.trim() || null : current.diagnosis,
      responsiblePhysician:
        cmd.responsiblePhysician !== undefined
          ? cmd.responsiblePhysician?.trim() || null
          : current.responsiblePhysician,
      expectedDischargeAt:
        cmd.expectedDischargeAt !== undefined ? cmd.expectedDischargeAt : current.expectedDischargeAt,
      precautions: cmd.precautions !== undefined ? cmd.precautions : current.precautions,
      mobilityLevel:
        cmd.mobilityLevel !== undefined ? cmd.mobilityLevel?.trim() || null : current.mobilityLevel,
      assistanceNeeded:
        cmd.assistanceNeeded !== undefined
          ? cmd.assistanceNeeded?.trim() || null
          : current.assistanceNeeded,
      initialGoals:
        cmd.initialGoals !== undefined ? cmd.initialGoals?.trim() || null : current.initialGoals,
      openPending:
        cmd.openPending !== undefined ? cmd.openPending?.trim() || null : current.openPending,
      updatedAt: new Date(),
    });
    const detail = await this.plantao.findAdmission(cmd.clinicId, cmd.admissionId);
    if (!detail) return Result.error(new NotFoundFailure('Internação', cmd.admissionId));
    return Result.ok(detail);
  }

  async discharge(cmd: DischargeCommand): Promise<Result<AdmissionDetail, Failure>> {
    const current = await this.plantao.findAdmission(cmd.clinicId, cmd.admissionId);
    if (!current) return Result.error(new NotFoundFailure('Internação', cmd.admissionId));
    if (current.status !== AdmissionStatus.ACTIVE) {
      return Result.error(new ValidationFailure('Internação já está encerrada.'));
    }

    await this.plantao.dischargeAdmission(cmd.admissionId, {
      dischargedAt: cmd.dischargedAt ?? new Date(),
      dischargeDestination: cmd.dischargeDestination,
      dischargeSummary: cmd.dischargeSummary?.trim() || null,
      openPending: null,
    });
    await this.plantao.markBedFree(current.bedId);

    const openShift = await this.plantao.findOpenShift(cmd.clinicId, current.hospitalSiteId);
    if (openShift) {
      const item = openShift.census.find((c) => c.admissionId === cmd.admissionId);
      if (item) {
        await this.plantao.updateCensusItem(cmd.clinicId, item.id, {
          status: CensusItemStatus.DISCHARGED_TODAY,
        });
      }
    }

    const detail = await this.plantao.findAdmission(cmd.clinicId, cmd.admissionId);
    if (!detail) return Result.error(new NotFoundFailure('Internação', cmd.admissionId));
    return Result.ok(detail);
  }

  async getAdmission(clinicId: string, id: string): Promise<Result<AdmissionDetail, Failure>> {
    const detail = await this.plantao.findAdmission(clinicId, id);
    if (!detail) return Result.error(new NotFoundFailure('Internação', id));
    return Result.ok(detail);
  }

  async listAdmissions(
    clinicId: string,
    hospitalSiteId?: string,
    status?: 'ACTIVE' | 'DISCHARGED',
  ): Promise<Result<AdmissionDetail[], Failure>> {
    return Result.ok(
      await this.plantao.listAdmissions(
        clinicId,
        hospitalSiteId,
        status === 'ACTIVE'
          ? AdmissionStatus.ACTIVE
          : status === 'DISCHARGED'
            ? AdmissionStatus.DISCHARGED
            : undefined,
      ),
    );
  }

  async openShift(cmd: OpenShiftCommand): Promise<Result<ShiftDetail, Failure>> {
    const site = await this.plantao.findHospitalSite(cmd.clinicId, cmd.hospitalSiteId);
    if (!site) return Result.error(new NotFoundFailure('Hospital', cmd.hospitalSiteId));
    if (cmd.endsAt <= cmd.startsAt) {
      return Result.error(new ValidationFailure('Horário de fim deve ser após o início.'));
    }

    const existing = await this.plantao.findOpenShift(cmd.clinicId, cmd.hospitalSiteId);
    if (existing) {
      return Result.error(new ValidationFailure('Já existe um plantão aberto neste hospital.'));
    }

    const team = new Set(cmd.teamUserIds ?? []);
    team.add(cmd.openedById);
    for (const userId of team) {
      const user = await this.users.findById(cmd.clinicId, userId);
      if (!user) return Result.error(new NotFoundFailure('Profissional', userId));
    }

    const shift: Shift = {
      id: this.ids.generate(),
      clinicId: cmd.clinicId,
      hospitalSiteId: cmd.hospitalSiteId,
      openedById: cmd.openedById,
      startsAt: cmd.startsAt,
      endsAt: cmd.endsAt,
      wardIds: cmd.wardIds ?? [],
      status: ShiftStatus.OPEN,
      notes: cmd.notes?.trim() || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.plantao.createShift(shift, [...team]);

    const admissions = await this.plantao.listActiveAdmissions(
      cmd.clinicId,
      cmd.hospitalSiteId,
      cmd.wardIds?.length ? cmd.wardIds : undefined,
    );

    const items: CensusItem[] = admissions.map((a) => ({
      id: this.ids.generate(),
      shiftId: shift.id,
      admissionId: a.id,
      priority: CensusPriority.STABLE,
      status: CensusItemStatus.PENDING,
      notes: a.openPending,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    if (items.length) await this.plantao.createCensusItems(items);

    const detail = await this.plantao.findShift(cmd.clinicId, shift.id);
    if (!detail) return Result.error(new NotFoundFailure('Plantão', shift.id));
    return Result.ok(detail);
  }

  async getShift(clinicId: string, id: string): Promise<Result<ShiftDetail, Failure>> {
    const detail = await this.plantao.findShift(clinicId, id);
    if (!detail) return Result.error(new NotFoundFailure('Plantão', id));
    return Result.ok(detail);
  }

  async getOpenShift(
    clinicId: string,
    hospitalSiteId?: string,
  ): Promise<Result<ShiftDetail | null, Failure>> {
    return Result.ok(await this.plantao.findOpenShift(clinicId, hospitalSiteId));
  }

  async listShifts(clinicId: string, hospitalSiteId?: string): Promise<Result<Shift[], Failure>> {
    return Result.ok(await this.plantao.listShifts(clinicId, hospitalSiteId));
  }

  async updateCensusItem(cmd: UpdateCensusItemCommand): Promise<Result<CensusItemDetail, Failure>> {
    const item = await this.plantao.updateCensusItem(cmd.clinicId, cmd.itemId, {
      priority: cmd.priority,
      status: cmd.status,
      notes: cmd.notes,
    });
    if (!item) return Result.error(new NotFoundFailure('Censo', cmd.itemId));
    return Result.ok(item);
  }

  async createEncounter(cmd: CreateEncounterCommand): Promise<Result<PlantaoEncounter, Failure>> {
    if (!cmd.conduct?.trim()) {
      return Result.error(new ValidationFailure('Conduta é obrigatória.'));
    }

    const shift = await this.plantao.findShift(cmd.clinicId, cmd.shiftId);
    if (!shift) return Result.error(new NotFoundFailure('Plantão', cmd.shiftId));
    if (shift.status !== ShiftStatus.OPEN && shift.status !== ShiftStatus.HANDOFF) {
      return Result.error(new ValidationFailure('Plantão está fechado.'));
    }

    const admission = await this.plantao.findAdmission(cmd.clinicId, cmd.admissionId);
    if (!admission) return Result.error(new NotFoundFailure('Internação', cmd.admissionId));
    if (admission.status !== AdmissionStatus.ACTIVE) {
      return Result.error(new ValidationFailure('Internação não está ativa.'));
    }

    const professional = await this.users.findById(cmd.clinicId, cmd.professionalId);
    if (!professional) return Result.error(new NotFoundFailure('Profissional', cmd.professionalId));

    const encounter: PlantaoEncounter = {
      id: this.ids.generate(),
      clinicId: cmd.clinicId,
      shiftId: cmd.shiftId,
      admissionId: cmd.admissionId,
      professionalId: cmd.professionalId,
      conductedAt: new Date(),
      conduct: cmd.conduct.trim(),
      tags: cmd.tags ?? [],
      response: cmd.response?.trim() || null,
      intercurrence: cmd.intercurrence?.trim() || null,
      painScale: cmd.painScale ?? null,
      dyspneaScale: cmd.dyspneaScale ?? null,
      mobilityAssist: cmd.mobilityAssist?.trim() || null,
      precautionsUpdate: cmd.precautionsUpdate ?? null,
      pendingForNext: cmd.pendingForNext?.trim() || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const saved = await this.plantao.createEncounter(encounter);

    if (cmd.precautionsUpdate) {
      await this.plantao.mergeAdmissionPrecautions(cmd.admissionId, {
        ...(admission.precautions ?? {}),
        ...cmd.precautionsUpdate,
      });
    }

    await this.plantao.updateAdmissionOpenPending(cmd.admissionId, encounter.pendingForNext);

    if (cmd.markCensusDone !== false) {
      const item = shift.census.find((c) => c.admissionId === cmd.admissionId);
      if (item && item.status !== CensusItemStatus.DISCHARGED_TODAY) {
        await this.plantao.updateCensusItem(cmd.clinicId, item.id, {
          status: CensusItemStatus.DONE,
        });
      }
    }

    return Result.ok(saved);
  }

  async listEncountersByAdmission(
    clinicId: string,
    admissionId: string,
  ): Promise<Result<PlantaoEncounter[], Failure>> {
    const admission = await this.plantao.findAdmission(clinicId, admissionId);
    if (!admission) return Result.error(new NotFoundFailure('Internação', admissionId));
    return Result.ok(await this.plantao.listEncountersByAdmission(clinicId, admissionId));
  }

  async closeShiftWithHandoff(cmd: CloseShiftHandoffCommand): Promise<Result<Handoff, Failure>> {
    const shift = await this.plantao.findShift(cmd.clinicId, cmd.shiftId);
    if (!shift) return Result.error(new NotFoundFailure('Plantão', cmd.shiftId));
    if (shift.status === ShiftStatus.CLOSED) {
      return Result.error(new ValidationFailure('Plantão já está fechado.'));
    }

    if (cmd.toUserId) {
      const toUser = await this.users.findById(cmd.clinicId, cmd.toUserId);
      if (!toUser) return Result.error(new NotFoundFailure('Profissional', cmd.toUserId));
    }

    const encounters = await this.plantao.listEncountersByShift(cmd.clinicId, cmd.shiftId);
    const intercurrenceCount = encounters.filter((e) => e.intercurrence).length;

    const pendencies = shift.census
      .filter(
        (c) =>
          c.admission.openPending ||
          c.status === CensusItemStatus.PENDING ||
          c.status === CensusItemStatus.IN_PROGRESS,
      )
      .map((c) => ({
        admissionId: c.admissionId,
        patientName: c.admission.patientName,
        bedCode: c.admission.bedCode,
        wardName: c.admission.wardName,
        pending:
          c.admission.openPending ||
          (c.status === CensusItemStatus.PENDING
            ? 'Não atendido neste plantão'
            : 'Em acompanhamento'),
      }));

    const summary: HandoffSummary = {
      doneCount: shift.census.filter((c) => c.status === CensusItemStatus.DONE).length,
      pendingCount: shift.census.filter(
        (c) => c.status === CensusItemStatus.PENDING || c.status === CensusItemStatus.IN_PROGRESS,
      ).length,
      contraindicatedCount: shift.census.filter((c) => c.status === CensusItemStatus.CONTRAINDICATED)
        .length,
      dischargedCount: shift.census.filter((c) => c.status === CensusItemStatus.DISCHARGED_TODAY)
        .length,
      intercurrenceCount,
      pendencies,
    };

    await this.plantao.updateShiftStatus(cmd.shiftId, ShiftStatus.HANDOFF);

    const handoff: Handoff = {
      id: this.ids.generate(),
      shiftId: cmd.shiftId,
      fromUserId: cmd.fromUserId,
      toUserId: cmd.toUserId ?? null,
      summary,
      notes: cmd.notes?.trim() || null,
      confirmedAt: new Date(),
      createdAt: new Date(),
    };

    const saved = await this.plantao.createHandoff(handoff);
    await this.plantao.updateShiftStatus(cmd.shiftId, ShiftStatus.CLOSED);
    return Result.ok(saved);
  }
}
