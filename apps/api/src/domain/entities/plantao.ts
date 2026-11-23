import type {
  AdmissionStatus,
  BedStatus,
  CensusItemStatus,
  CensusPriority,
  DischargeDestination,
  ShiftStatus,
} from './enums';

export type Precautions = {
  isolation?: boolean;
  oxygen?: boolean;
  mechanicalVentilation?: boolean;
  niv?: boolean;
  tracheostomy?: boolean;
  drain?: boolean;
  orthosis?: boolean;
  mobilityRestriction?: boolean;
  fallRisk?: boolean;
  notes?: string | null;
};

export type HospitalSite = {
  id: string;
  clinicId: string;
  name: string;
  city: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type Ward = {
  id: string;
  hospitalSiteId: string;
  name: string;
  active: boolean;
  createdAt: Date;
};

export type Bed = {
  id: string;
  wardId: string;
  code: string;
  status: BedStatus;
  active: boolean;
  createdAt: Date;
};

export type Admission = {
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
  precautions: Precautions | null;
  mobilityLevel: string | null;
  assistanceNeeded: string | null;
  initialGoals: string | null;
  openPending: string | null;
  status: AdmissionStatus;
  dischargedAt: Date | null;
  dischargeDestination: DischargeDestination | null;
  dischargeSummary: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Shift = {
  id: string;
  clinicId: string;
  hospitalSiteId: string;
  openedById: string;
  startsAt: Date;
  endsAt: Date;
  wardIds: string[];
  status: ShiftStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ShiftAssignment = {
  id: string;
  shiftId: string;
  userId: string;
};

export type CensusItem = {
  id: string;
  shiftId: string;
  admissionId: string;
  priority: CensusPriority;
  status: CensusItemStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PlantaoEncounter = {
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
  precautionsUpdate: Precautions | null;
  pendingForNext: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type HandoffSummary = {
  doneCount: number;
  pendingCount: number;
  contraindicatedCount: number;
  dischargedCount: number;
  intercurrenceCount: number;
  pendencies: Array<{
    admissionId: string;
    patientName: string;
    bedCode: string;
    wardName: string;
    pending: string;
  }>;
};

export type Handoff = {
  id: string;
  shiftId: string;
  fromUserId: string;
  toUserId: string | null;
  summary: HandoffSummary;
  notes: string | null;
  confirmedAt: Date;
  createdAt: Date;
};

export type BedWithWard = Bed & {
  wardName: string;
  hospitalSiteId: string;
};

export type AdmissionDetail = Admission & {
  patientName: string;
  patientBirthDate: Date | null;
  bedCode: string;
  wardId: string;
  wardName: string;
  hospitalName: string;
};

export type CensusItemDetail = CensusItem & {
  admission: AdmissionDetail;
};

export type ShiftDetail = Shift & {
  hospitalName: string;
  teamUserIds: string[];
  census: CensusItemDetail[];
  handoff?: Handoff | null;
};

export type HospitalSiteDetail = HospitalSite & {
  wards: Array<Ward & { beds: Bed[] }>;
};
