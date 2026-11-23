import type { Result } from '../../core/result';
import type { Failure } from '../../failures';
import type {
  AdmissionDetail,
  Bed,
  CensusItemDetail,
  CensusItemStatus,
  CensusPriority,
  DischargeDestination,
  Handoff,
  HospitalSite,
  HospitalSiteDetail,
  PlantaoEncounter,
  Precautions,
  Shift,
  ShiftDetail,
  Ward,
} from '../../entities';

export type CreateHospitalSiteCommand = {
  clinicId: string;
  name: string;
  city?: string | null;
};

export type CreateWardCommand = {
  clinicId: string;
  hospitalSiteId: string;
  name: string;
};

export type CreateBedCommand = {
  clinicId: string;
  wardId: string;
  code: string;
};

export type AdmitPatientCommand = {
  clinicId: string;
  patientId: string;
  hospitalSiteId: string;
  bedId: string;
  hospitalMrn?: string | null;
  insuranceName?: string | null;
  admittedAt?: Date;
  reason?: string | null;
  diagnosis?: string | null;
  responsiblePhysician?: string | null;
  expectedDischargeAt?: Date | null;
  precautions?: Precautions | null;
  mobilityLevel?: string | null;
  assistanceNeeded?: string | null;
  initialGoals?: string | null;
};

export type TransferBedCommand = {
  clinicId: string;
  admissionId: string;
  bedId: string;
};

export type UpdateAdmissionCommand = {
  clinicId: string;
  admissionId: string;
  hospitalMrn?: string | null;
  insuranceName?: string | null;
  reason?: string | null;
  diagnosis?: string | null;
  responsiblePhysician?: string | null;
  expectedDischargeAt?: Date | null;
  precautions?: Precautions | null;
  mobilityLevel?: string | null;
  assistanceNeeded?: string | null;
  initialGoals?: string | null;
  openPending?: string | null;
};

export type DischargeCommand = {
  clinicId: string;
  admissionId: string;
  dischargedAt?: Date;
  dischargeDestination: DischargeDestination;
  dischargeSummary?: string | null;
};

export type OpenShiftCommand = {
  clinicId: string;
  openedById: string;
  hospitalSiteId: string;
  startsAt: Date;
  endsAt: Date;
  wardIds?: string[];
  teamUserIds?: string[];
  notes?: string | null;
};

export type UpdateCensusItemCommand = {
  clinicId: string;
  itemId: string;
  priority?: CensusPriority;
  status?: CensusItemStatus;
  notes?: string | null;
};

export type CreateEncounterCommand = {
  clinicId: string;
  shiftId: string;
  admissionId: string;
  professionalId: string;
  conduct: string;
  tags?: string[];
  response?: string | null;
  intercurrence?: string | null;
  painScale?: number | null;
  dyspneaScale?: number | null;
  mobilityAssist?: string | null;
  precautionsUpdate?: Precautions | null;
  pendingForNext?: string | null;
  markCensusDone?: boolean;
};

export type CloseShiftHandoffCommand = {
  clinicId: string;
  shiftId: string;
  fromUserId: string;
  toUserId?: string | null;
  notes?: string | null;
};

export interface PlantaoUseCase {
  createHospitalSite(cmd: CreateHospitalSiteCommand): Promise<Result<HospitalSite, Failure>>;
  listHospitalSites(clinicId: string): Promise<Result<HospitalSiteDetail[], Failure>>;
  createWard(cmd: CreateWardCommand): Promise<Result<Ward, Failure>>;
  createBed(cmd: CreateBedCommand): Promise<Result<Bed, Failure>>;
  listFreeBeds(
    clinicId: string,
    hospitalSiteId: string,
    wardId?: string,
  ): Promise<Result<Bed[], Failure>>;

  admit(cmd: AdmitPatientCommand): Promise<Result<AdmissionDetail, Failure>>;
  transferBed(cmd: TransferBedCommand): Promise<Result<AdmissionDetail, Failure>>;
  updateAdmission(cmd: UpdateAdmissionCommand): Promise<Result<AdmissionDetail, Failure>>;
  discharge(cmd: DischargeCommand): Promise<Result<AdmissionDetail, Failure>>;
  getAdmission(clinicId: string, id: string): Promise<Result<AdmissionDetail, Failure>>;
  listAdmissions(
    clinicId: string,
    hospitalSiteId?: string,
    status?: 'ACTIVE' | 'DISCHARGED',
  ): Promise<Result<AdmissionDetail[], Failure>>;

  openShift(cmd: OpenShiftCommand): Promise<Result<ShiftDetail, Failure>>;
  getShift(clinicId: string, id: string): Promise<Result<ShiftDetail, Failure>>;
  getOpenShift(clinicId: string, hospitalSiteId?: string): Promise<Result<ShiftDetail | null, Failure>>;
  listShifts(clinicId: string, hospitalSiteId?: string): Promise<Result<Shift[], Failure>>;
  updateCensusItem(cmd: UpdateCensusItemCommand): Promise<Result<CensusItemDetail, Failure>>;

  createEncounter(cmd: CreateEncounterCommand): Promise<Result<PlantaoEncounter, Failure>>;
  listEncountersByAdmission(
    clinicId: string,
    admissionId: string,
  ): Promise<Result<PlantaoEncounter[], Failure>>;

  closeShiftWithHandoff(cmd: CloseShiftHandoffCommand): Promise<Result<Handoff, Failure>>;
}
