import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import {
  AdmissionStatus,
  BedStatus,
  type Admission,
  type AdmissionDetail,
  type Bed,
  type CensusItem,
  type CensusItemDetail,
  type CensusItemStatus,
  type CensusPriority,
  type DischargeDestination,
  type Handoff,
  type HandoffSummary,
  type HospitalSite,
  type HospitalSiteDetail,
  type PlantaoEncounter,
  type Precautions,
  type Shift,
  type ShiftDetail,
  type ShiftStatus,
  type Ward,
} from '../../domain/entities';
import type { PlantaoRepository } from '../../domain/ports/output';
import { PrismaService } from '../database/prisma.service';

function asPrecautions(value: unknown): Precautions | null {
  if (!value || typeof value !== 'object') return null;
  return value as Precautions;
}

function asHandoffSummary(value: unknown): HandoffSummary {
  return value as HandoffSummary;
}

function mapHospitalSite(row: {
  id: string;
  clinicId: string;
  name: string;
  city: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}): HospitalSite {
  return {
    id: row.id,
    clinicId: row.clinicId,
    name: row.name,
    city: row.city,
    active: row.active,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapWard(row: {
  id: string;
  hospitalSiteId: string;
  name: string;
  active: boolean;
  createdAt: Date;
}): Ward {
  return {
    id: row.id,
    hospitalSiteId: row.hospitalSiteId,
    name: row.name,
    active: row.active,
    createdAt: row.createdAt,
  };
}

function mapBed(row: {
  id: string;
  wardId: string;
  code: string;
  status: string;
  active: boolean;
  createdAt: Date;
}): Bed {
  return {
    id: row.id,
    wardId: row.wardId,
    code: row.code,
    status: row.status as BedStatus,
    active: row.active,
    createdAt: row.createdAt,
  };
}

function mapAdmission(row: {
  id: string;
  clinicId: string;
  patientId: string;
  hospitalSiteId: string;
  bedId: string;
  hospitalMrn: string | null;
  insuranceName: string | null;
  admittedAt: Date;
  reason: string | null;
  diagnosis: string | null;
  responsiblePhysician: string | null;
  expectedDischargeAt: Date | null;
  precautions: unknown;
  mobilityLevel: string | null;
  assistanceNeeded: string | null;
  initialGoals: string | null;
  openPending: string | null;
  status: string;
  dischargedAt: Date | null;
  dischargeDestination: string | null;
  dischargeSummary: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Admission {
  return {
    id: row.id,
    clinicId: row.clinicId,
    patientId: row.patientId,
    hospitalSiteId: row.hospitalSiteId,
    bedId: row.bedId,
    hospitalMrn: row.hospitalMrn,
    insuranceName: row.insuranceName,
    admittedAt: row.admittedAt,
    reason: row.reason,
    diagnosis: row.diagnosis,
    responsiblePhysician: row.responsiblePhysician,
    expectedDischargeAt: row.expectedDischargeAt,
    precautions: asPrecautions(row.precautions),
    mobilityLevel: row.mobilityLevel,
    assistanceNeeded: row.assistanceNeeded,
    initialGoals: row.initialGoals,
    openPending: row.openPending,
    status: row.status as Admission['status'],
    dischargedAt: row.dischargedAt,
    dischargeDestination: row.dischargeDestination as Admission['dischargeDestination'],
    dischargeSummary: row.dischargeSummary,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapAdmissionDetail(row: {
  id: string;
  clinicId: string;
  patientId: string;
  hospitalSiteId: string;
  bedId: string;
  hospitalMrn: string | null;
  insuranceName: string | null;
  admittedAt: Date;
  reason: string | null;
  diagnosis: string | null;
  responsiblePhysician: string | null;
  expectedDischargeAt: Date | null;
  precautions: unknown;
  mobilityLevel: string | null;
  assistanceNeeded: string | null;
  initialGoals: string | null;
  openPending: string | null;
  status: string;
  dischargedAt: Date | null;
  dischargeDestination: string | null;
  dischargeSummary: string | null;
  createdAt: Date;
  updatedAt: Date;
  patient: { name: string; birthDate: Date | null };
  bed: { code: string; wardId: string; ward: { name: string } };
  hospitalSite: { name: string };
}): AdmissionDetail {
  return {
    ...mapAdmission(row),
    patientName: row.patient.name,
    patientBirthDate: row.patient.birthDate,
    bedCode: row.bed.code,
    wardId: row.bed.wardId,
    wardName: row.bed.ward.name,
    hospitalName: row.hospitalSite.name,
  };
}

const admissionInclude = {
  patient: { select: { name: true, birthDate: true } },
  bed: { select: { code: true, wardId: true, ward: { select: { name: true } } } },
  hospitalSite: { select: { name: true } },
} as const;

function mapShift(row: {
  id: string;
  clinicId: string;
  hospitalSiteId: string;
  openedById: string;
  startsAt: Date;
  endsAt: Date;
  wardIds: string[];
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Shift {
  return {
    id: row.id,
    clinicId: row.clinicId,
    hospitalSiteId: row.hospitalSiteId,
    openedById: row.openedById,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    wardIds: row.wardIds,
    status: row.status as Shift['status'],
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapCensusItem(row: {
  id: string;
  shiftId: string;
  admissionId: string;
  priority: string;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): CensusItem {
  return {
    id: row.id,
    shiftId: row.shiftId,
    admissionId: row.admissionId,
    priority: row.priority as CensusItem['priority'],
    status: row.status as CensusItem['status'],
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapEncounter(row: {
  id: string;
  clinicId: string;
  shiftId: string;
  admissionId: string;
  professionalId: string;
  conductedAt: Date;
  conduct: string;
  tags: string[];
  response: string | null;
  intercurrence: string | null;
  painScale: number | null;
  dyspneaScale: number | null;
  mobilityAssist: string | null;
  precautionsUpdate: unknown;
  pendingForNext: string | null;
  createdAt: Date;
  updatedAt: Date;
}): PlantaoEncounter {
  return {
    id: row.id,
    clinicId: row.clinicId,
    shiftId: row.shiftId,
    admissionId: row.admissionId,
    professionalId: row.professionalId,
    conductedAt: row.conductedAt,
    conduct: row.conduct,
    tags: row.tags,
    response: row.response,
    intercurrence: row.intercurrence,
    painScale: row.painScale,
    dyspneaScale: row.dyspneaScale,
    mobilityAssist: row.mobilityAssist,
    precautionsUpdate: asPrecautions(row.precautionsUpdate),
    pendingForNext: row.pendingForNext,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapHandoff(row: {
  id: string;
  shiftId: string;
  fromUserId: string;
  toUserId: string | null;
  summary: unknown;
  notes: string | null;
  confirmedAt: Date;
  createdAt: Date;
}): Handoff {
  return {
    id: row.id,
    shiftId: row.shiftId,
    fromUserId: row.fromUserId,
    toUserId: row.toUserId,
    summary: asHandoffSummary(row.summary),
    notes: row.notes,
    confirmedAt: row.confirmedAt,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class PrismaPlantaoRepository implements PlantaoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createHospitalSite(site: HospitalSite): Promise<HospitalSite> {
    const row = await this.prisma.hospitalSite.create({
      data: {
        id: site.id,
        clinicId: site.clinicId,
        name: site.name,
        city: site.city,
        active: site.active,
        createdAt: site.createdAt,
        updatedAt: site.updatedAt,
      },
    });
    return mapHospitalSite(row);
  }

  async listHospitalSites(clinicId: string): Promise<HospitalSiteDetail[]> {
    const rows = await this.prisma.hospitalSite.findMany({
      where: { clinicId, active: true },
      include: {
        wards: {
          where: { active: true },
          orderBy: { name: 'asc' },
          include: {
            beds: { where: { active: true }, orderBy: { code: 'asc' } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    return rows.map((row) => ({
      ...mapHospitalSite(row),
      wards: row.wards.map((w) => ({
        ...mapWard(w),
        beds: w.beds.map(mapBed),
      })),
    }));
  }

  async findHospitalSite(clinicId: string, id: string): Promise<HospitalSite | null> {
    const row = await this.prisma.hospitalSite.findFirst({ where: { id, clinicId } });
    return row ? mapHospitalSite(row) : null;
  }

  async createWard(ward: Ward): Promise<Ward> {
    const row = await this.prisma.ward.create({
      data: {
        id: ward.id,
        hospitalSiteId: ward.hospitalSiteId,
        name: ward.name,
        active: ward.active,
        createdAt: ward.createdAt,
      },
    });
    return mapWard(row);
  }

  async createBed(bed: Bed): Promise<Bed> {
    const row = await this.prisma.bed.create({
      data: {
        id: bed.id,
        wardId: bed.wardId,
        code: bed.code,
        status: bed.status,
        active: bed.active,
        createdAt: bed.createdAt,
      },
    });
    return mapBed(row);
  }

  async findBed(clinicId: string, bedId: string) {
    const row = await this.prisma.bed.findFirst({
      where: { id: bedId, ward: { hospitalSite: { clinicId } } },
      include: { ward: { select: { hospitalSiteId: true } } },
    });
    if (!row) return null;
    return {
      ...mapBed(row),
      hospitalSiteId: row.ward.hospitalSiteId,
      wardId: row.wardId,
    };
  }

  async updateBedStatus(bedId: string, status: BedStatus): Promise<void> {
    await this.prisma.bed.update({ where: { id: bedId }, data: { status } });
  }

  async listFreeBeds(clinicId: string, hospitalSiteId: string, wardId?: string): Promise<Bed[]> {
    const rows = await this.prisma.bed.findMany({
      where: {
        active: true,
        status: BedStatus.FREE,
        ward: {
          hospitalSiteId,
          hospitalSite: { clinicId },
          ...(wardId ? { id: wardId } : {}),
        },
      },
      orderBy: { code: 'asc' },
    });
    return rows.map(mapBed);
  }

  async createAdmission(admission: Admission): Promise<Admission> {
    const row = await this.prisma.admission.create({
      data: {
        id: admission.id,
        clinicId: admission.clinicId,
        patientId: admission.patientId,
        hospitalSiteId: admission.hospitalSiteId,
        bedId: admission.bedId,
        hospitalMrn: admission.hospitalMrn,
        insuranceName: admission.insuranceName,
        admittedAt: admission.admittedAt,
        reason: admission.reason,
        diagnosis: admission.diagnosis,
        responsiblePhysician: admission.responsiblePhysician,
        expectedDischargeAt: admission.expectedDischargeAt,
        precautions: (admission.precautions ?? undefined) as Prisma.InputJsonValue | undefined,
        mobilityLevel: admission.mobilityLevel,
        assistanceNeeded: admission.assistanceNeeded,
        initialGoals: admission.initialGoals,
        openPending: admission.openPending,
        status: admission.status,
        createdAt: admission.createdAt,
        updatedAt: admission.updatedAt,
      },
    });
    return mapAdmission(row);
  }

  async updateAdmission(admission: Admission): Promise<Admission> {
    const row = await this.prisma.admission.update({
      where: { id: admission.id },
      data: {
        bedId: admission.bedId,
        hospitalMrn: admission.hospitalMrn,
        insuranceName: admission.insuranceName,
        reason: admission.reason,
        diagnosis: admission.diagnosis,
        responsiblePhysician: admission.responsiblePhysician,
        expectedDischargeAt: admission.expectedDischargeAt,
        precautions: (admission.precautions ?? undefined) as Prisma.InputJsonValue | undefined,
        mobilityLevel: admission.mobilityLevel,
        assistanceNeeded: admission.assistanceNeeded,
        initialGoals: admission.initialGoals,
        openPending: admission.openPending,
        status: admission.status,
        dischargedAt: admission.dischargedAt,
        dischargeDestination: admission.dischargeDestination,
        dischargeSummary: admission.dischargeSummary,
        updatedAt: admission.updatedAt,
      },
    });
    return mapAdmission(row);
  }

  async findAdmission(clinicId: string, id: string): Promise<AdmissionDetail | null> {
    const row = await this.prisma.admission.findFirst({
      where: { id, clinicId },
      include: admissionInclude,
    });
    return row ? mapAdmissionDetail(row) : null;
  }

  async listActiveAdmissions(
    clinicId: string,
    hospitalSiteId: string,
    wardIds?: string[],
  ): Promise<AdmissionDetail[]> {
    const rows = await this.prisma.admission.findMany({
      where: {
        clinicId,
        hospitalSiteId,
        status: AdmissionStatus.ACTIVE,
        ...(wardIds?.length ? { bed: { wardId: { in: wardIds } } } : {}),
      },
      include: admissionInclude,
      orderBy: [{ bed: { ward: { name: 'asc' } } }, { bed: { code: 'asc' } }],
    });
    return rows.map(mapAdmissionDetail);
  }

  async listAdmissions(
    clinicId: string,
    hospitalSiteId?: string,
    status?: AdmissionStatus,
  ): Promise<AdmissionDetail[]> {
    const rows = await this.prisma.admission.findMany({
      where: {
        clinicId,
        ...(hospitalSiteId ? { hospitalSiteId } : {}),
        ...(status ? { status } : {}),
      },
      include: admissionInclude,
      orderBy: { admittedAt: 'desc' },
    });
    return rows.map(mapAdmissionDetail);
  }

  async createShift(shift: Shift, teamUserIds: string[]): Promise<Shift> {
    const row = await this.prisma.shift.create({
      data: {
        id: shift.id,
        clinicId: shift.clinicId,
        hospitalSiteId: shift.hospitalSiteId,
        openedById: shift.openedById,
        startsAt: shift.startsAt,
        endsAt: shift.endsAt,
        wardIds: shift.wardIds,
        status: shift.status,
        notes: shift.notes,
        createdAt: shift.createdAt,
        updatedAt: shift.updatedAt,
        assignments: {
          create: teamUserIds.map((userId) => ({
            id: randomUUID(),
            userId,
          })),
        },
      },
    });
    return mapShift(row);
  }

  async updateShiftStatus(shiftId: string, status: ShiftStatus): Promise<void> {
    await this.prisma.shift.update({ where: { id: shiftId }, data: { status } });
  }

  async findShift(clinicId: string, id: string): Promise<ShiftDetail | null> {
    const row = await this.prisma.shift.findFirst({
      where: { id, clinicId },
      include: {
        hospitalSite: { select: { name: true } },
        assignments: true,
        handoff: true,
        censusItems: {
          include: { admission: { include: admissionInclude } },
          orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });
    if (!row) return null;
    return {
      ...mapShift(row),
      hospitalName: row.hospitalSite.name,
      teamUserIds: row.assignments.map((a) => a.userId),
      census: row.censusItems.map((item) => ({
        ...mapCensusItem(item),
        admission: mapAdmissionDetail(item.admission),
      })),
      handoff: row.handoff ? mapHandoff(row.handoff) : null,
    };
  }

  async findOpenShift(clinicId: string, hospitalSiteId?: string): Promise<ShiftDetail | null> {
    const row = await this.prisma.shift.findFirst({
      where: {
        clinicId,
        status: { in: ['OPEN', 'HANDOFF'] },
        ...(hospitalSiteId ? { hospitalSiteId } : {}),
      },
      orderBy: { startsAt: 'desc' },
    });
    if (!row) return null;
    return this.findShift(clinicId, row.id);
  }

  async listShifts(clinicId: string, hospitalSiteId?: string): Promise<Shift[]> {
    const rows = await this.prisma.shift.findMany({
      where: {
        clinicId,
        ...(hospitalSiteId ? { hospitalSiteId } : {}),
      },
      orderBy: { startsAt: 'desc' },
      take: 50,
    });
    return rows.map(mapShift);
  }

  async createCensusItems(items: CensusItem[]): Promise<void> {
    if (!items.length) return;
    await this.prisma.censusItem.createMany({
      data: items.map((item) => ({
        id: item.id,
        shiftId: item.shiftId,
        admissionId: item.admissionId,
        priority: item.priority,
        status: item.status,
        notes: item.notes,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    });
  }

  async updateCensusItem(
    clinicId: string,
    itemId: string,
    data: { priority?: CensusPriority; status?: CensusItemStatus; notes?: string | null },
  ): Promise<CensusItemDetail | null> {
    const existing = await this.prisma.censusItem.findFirst({
      where: { id: itemId, shift: { clinicId } },
    });
    if (!existing) return null;
    const row = await this.prisma.censusItem.update({
      where: { id: itemId },
      data: {
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
      include: { admission: { include: admissionInclude } },
    });
    return {
      ...mapCensusItem(row),
      admission: mapAdmissionDetail(row.admission),
    };
  }

  async listCensus(clinicId: string, shiftId: string): Promise<CensusItemDetail[]> {
    const rows = await this.prisma.censusItem.findMany({
      where: { shiftId, shift: { clinicId } },
      include: { admission: { include: admissionInclude } },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((row) => ({
      ...mapCensusItem(row),
      admission: mapAdmissionDetail(row.admission),
    }));
  }

  async createEncounter(encounter: PlantaoEncounter): Promise<PlantaoEncounter> {
    const row = await this.prisma.plantaoEncounter.create({
      data: {
        id: encounter.id,
        clinicId: encounter.clinicId,
        shiftId: encounter.shiftId,
        admissionId: encounter.admissionId,
        professionalId: encounter.professionalId,
        conductedAt: encounter.conductedAt,
        conduct: encounter.conduct,
        tags: encounter.tags,
        response: encounter.response,
        intercurrence: encounter.intercurrence,
        painScale: encounter.painScale,
        dyspneaScale: encounter.dyspneaScale,
        mobilityAssist: encounter.mobilityAssist,
        precautionsUpdate: (encounter.precautionsUpdate ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        pendingForNext: encounter.pendingForNext,
        createdAt: encounter.createdAt,
        updatedAt: encounter.updatedAt,
      },
    });
    return mapEncounter(row);
  }

  async listEncountersByAdmission(
    clinicId: string,
    admissionId: string,
  ): Promise<PlantaoEncounter[]> {
    const rows = await this.prisma.plantaoEncounter.findMany({
      where: { clinicId, admissionId },
      orderBy: { conductedAt: 'desc' },
    });
    return rows.map(mapEncounter);
  }

  async listEncountersByShift(clinicId: string, shiftId: string): Promise<PlantaoEncounter[]> {
    const rows = await this.prisma.plantaoEncounter.findMany({
      where: { clinicId, shiftId },
      orderBy: { conductedAt: 'desc' },
    });
    return rows.map(mapEncounter);
  }

  async updateAdmissionOpenPending(admissionId: string, openPending: string | null): Promise<void> {
    await this.prisma.admission.update({
      where: { id: admissionId },
      data: { openPending },
    });
  }

  async mergeAdmissionPrecautions(admissionId: string, precautions: Precautions): Promise<void> {
    await this.prisma.admission.update({
      where: { id: admissionId },
      data: { precautions: precautions as Prisma.InputJsonValue },
    });
  }

  async createHandoff(handoff: Handoff): Promise<Handoff> {
    const row = await this.prisma.handoff.create({
      data: {
        id: handoff.id,
        shiftId: handoff.shiftId,
        fromUserId: handoff.fromUserId,
        toUserId: handoff.toUserId,
        summary: handoff.summary as unknown as Prisma.InputJsonValue,
        notes: handoff.notes,
        confirmedAt: handoff.confirmedAt,
        createdAt: handoff.createdAt,
      },
    });
    return mapHandoff(row);
  }

  async findHandoffByShift(clinicId: string, shiftId: string): Promise<Handoff | null> {
    const row = await this.prisma.handoff.findFirst({
      where: { shiftId, shift: { clinicId } },
    });
    return row ? mapHandoff(row) : null;
  }

  async markBedFree(bedId: string): Promise<void> {
    await this.updateBedStatus(bedId, BedStatus.FREE);
  }

  async dischargeAdmission(
    admissionId: string,
    data: {
      dischargedAt: Date;
      dischargeDestination: DischargeDestination;
      dischargeSummary: string | null;
      openPending: null;
    },
  ): Promise<Admission> {
    const row = await this.prisma.admission.update({
      where: { id: admissionId },
      data: {
        status: AdmissionStatus.DISCHARGED,
        dischargedAt: data.dischargedAt,
        dischargeDestination: data.dischargeDestination,
        dischargeSummary: data.dischargeSummary,
        openPending: null,
      },
    });
    return mapAdmission(row);
  }
}
