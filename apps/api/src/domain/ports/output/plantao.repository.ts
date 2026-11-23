import type {
  Admission,
  AdmissionDetail,
  Bed,
  CensusItem,
  CensusItemDetail,
  Handoff,
  HospitalSite,
  HospitalSiteDetail,
  PlantaoEncounter,
  Precautions,
  Shift,
  ShiftDetail,
  Ward,
} from '../../entities';
import type {
  AdmissionStatus,
  BedStatus,
  CensusItemStatus,
  CensusPriority,
  DischargeDestination,
  ShiftStatus,
} from '../../entities';

export interface PlantaoRepository {
  // Hospitals / wards / beds
  createHospitalSite(site: HospitalSite): Promise<HospitalSite>;
  listHospitalSites(clinicId: string): Promise<HospitalSiteDetail[]>;
  findHospitalSite(clinicId: string, id: string): Promise<HospitalSite | null>;
  createWard(ward: Ward): Promise<Ward>;
  createBed(bed: Bed): Promise<Bed>;
  findBed(
    clinicId: string,
    bedId: string,
  ): Promise<(Bed & { hospitalSiteId: string; wardId: string }) | null>;
  updateBedStatus(bedId: string, status: BedStatus): Promise<void>;
  listFreeBeds(clinicId: string, hospitalSiteId: string, wardId?: string): Promise<Bed[]>;

  // Admissions
  createAdmission(admission: Admission): Promise<Admission>;
  updateAdmission(admission: Admission): Promise<Admission>;
  findAdmission(clinicId: string, id: string): Promise<AdmissionDetail | null>;
  listActiveAdmissions(
    clinicId: string,
    hospitalSiteId: string,
    wardIds?: string[],
  ): Promise<AdmissionDetail[]>;
  listAdmissions(clinicId: string, hospitalSiteId?: string, status?: AdmissionStatus): Promise<AdmissionDetail[]>;

  // Shifts
  createShift(shift: Shift, teamUserIds: string[]): Promise<Shift>;
  updateShiftStatus(shiftId: string, status: ShiftStatus): Promise<void>;
  findShift(clinicId: string, id: string): Promise<ShiftDetail | null>;
  findOpenShift(clinicId: string, hospitalSiteId?: string): Promise<ShiftDetail | null>;
  listShifts(clinicId: string, hospitalSiteId?: string): Promise<Shift[]>;

  // Census
  createCensusItems(items: CensusItem[]): Promise<void>;
  updateCensusItem(
    clinicId: string,
    itemId: string,
    data: { priority?: CensusPriority; status?: CensusItemStatus; notes?: string | null },
  ): Promise<CensusItemDetail | null>;
  listCensus(clinicId: string, shiftId: string): Promise<CensusItemDetail[]>;

  // Encounters
  createEncounter(encounter: PlantaoEncounter): Promise<PlantaoEncounter>;
  listEncountersByAdmission(clinicId: string, admissionId: string): Promise<PlantaoEncounter[]>;
  listEncountersByShift(clinicId: string, shiftId: string): Promise<PlantaoEncounter[]>;
  updateAdmissionOpenPending(admissionId: string, openPending: string | null): Promise<void>;
  mergeAdmissionPrecautions(admissionId: string, precautions: Precautions): Promise<void>;

  // Handoff
  createHandoff(handoff: Handoff): Promise<Handoff>;
  findHandoffByShift(clinicId: string, shiftId: string): Promise<Handoff | null>;

  // Discharge helpers
  markBedFree(bedId: string): Promise<void>;
  dischargeAdmission(
    admissionId: string,
    data: {
      dischargedAt: Date;
      dischargeDestination: DischargeDestination;
      dischargeSummary: string | null;
      openPending: null;
    },
  ): Promise<Admission>;
}
