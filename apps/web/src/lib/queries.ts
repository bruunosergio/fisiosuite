import { api } from './api';
import type {
  AbsenceKind,
  Appointment,
  AppointmentStatus,
  AuthResponse,
  ClinicalRecord,
  CommissionReport,
  PackagePlan,
  Patient,
  PatientPackage,
  Payment,
  PaymentMethod,
  PaymentStatus,
  PlatformAuthResponse,
  PlatformClinicDetail,
  PlatformClinicSummary,
  PlatformOverview,
  PlantaoEncounter,
  Precautions,
  Role,
  Room,
  SessionNote,
  SessionNoteHistoryItem,
  ShiftDetail,
  User,
  AdmissionDetail,
  CensusItemDetail,
  CensusItemStatus,
  CensusPriority,
  DischargeDestination,
  Handoff,
  HospitalBed,
  HospitalSite,
  AnthropometricAssessment,
  BiologicalSex,
  CreateMealPlanPayload,
  EnergyCalculation,
  EnergyFormula,
  FoodItem,
  GoalStatus,
  MealPlan,
  MealPlanDetail,
  MealPlanStatus,
  NutritionAnamnesis,
  NutritionEvolution,
  NutritionEvolutionFormat,
  PatientGoal,
  Specialty,
} from './types';

// ---------- Auth ----------
export async function loginRequest(payload: { email: string; password: string }) {
  const { data } = await api.post<AuthResponse>('/auth/login', payload);
  return data;
}

export async function registerClinicRequest(payload: {
  clinicName: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  phone?: string;
  enabledModules?: Specialty[];
}) {
  const { data } = await api.post<AuthResponse>('/auth/register-clinic', payload);
  return data;
}

// ---------- Platform admin ----------
export async function platformLoginRequest(payload: { email: string; password: string }) {
  const { data } = await api.post<PlatformAuthResponse>('/platform/auth/login', payload);
  return data;
}

export async function fetchPlatformOverview() {
  const { data } = await api.get<PlatformOverview>('/platform/overview');
  return data;
}

export async function fetchPlatformClinics() {
  const { data } = await api.get<PlatformClinicSummary[]>('/platform/clinics');
  return data;
}

export async function fetchPlatformClinic(id: string) {
  const { data } = await api.get<PlatformClinicDetail>(`/platform/clinics/${id}`);
  return data;
}

export async function updatePlatformClinic(
  id: string,
  payload: {
    name?: string;
    phone?: string | null;
    document?: string | null;
    active?: boolean;
  },
) {
  const { data } = await api.patch(`/platform/clinics/${id}`, payload);
  return data;
}

// ---------- Users ----------
export async function fetchUsers() {
  const { data } = await api.get<User[]>('/users');
  return data;
}

export async function createUser(payload: {
  name: string;
  email: string;
  password: string;
  role: Role;
  commissionPct?: number | null;
}) {
  const { data } = await api.post<User>('/users', payload);
  return data;
}

export async function updateUser(
  id: string,
  payload: {
    name: string;
    email: string;
    role: Role;
    commissionPct?: number | null;
    active?: boolean;
    password?: string;
  },
) {
  const { data } = await api.patch<User>(`/users/${id}`, payload);
  return data;
}

// ---------- Patients ----------
export async function fetchPatients() {
  const { data } = await api.get<Patient[]>('/patients');
  return data;
}

export async function createPatient(payload: {
  name: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  cpf?: string;
  birthDate?: string;
  notes?: string;
}) {
  const { data } = await api.post<Patient>('/patients', payload);
  return data;
}

export async function updatePatient(
  id: string,
  payload: {
    name: string;
    phone?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    cpf?: string | null;
    birthDate?: string | null;
    notes?: string | null;
    active?: boolean;
  },
) {
  const { data } = await api.patch<Patient>(`/patients/${id}`, payload);
  return data;
}

// ---------- Rooms ----------
export async function fetchRooms() {
  const { data } = await api.get<Room[]>('/rooms');
  return data;
}

export async function createRoom(payload: { name: string; capacity: number }) {
  const { data } = await api.post<Room>('/rooms', payload);
  return data;
}

// ---------- Packages ----------
export async function fetchPackagePlans() {
  const { data } = await api.get<PackagePlan[]>('/packages/plans');
  return data;
}

export async function createPackagePlan(payload: {
  name: string;
  sessionCount: number;
  priceCents: number;
  validityDays?: number | null;
}) {
  const { data } = await api.post<PackagePlan>('/packages/plans', payload);
  return data;
}

export async function updatePackagePlan(
  id: string,
  payload: {
    name: string;
    sessionCount: number;
    priceCents: number;
    validityDays?: number | null;
    active?: boolean;
  },
) {
  const { data } = await api.patch<PackagePlan>(`/packages/plans/${id}`, payload);
  return data;
}

export async function deactivatePackagePlan(id: string) {
  const { data } = await api.delete<PackagePlan>(`/packages/plans/${id}`);
  return data;
}

export async function sellPackage(payload: {
  patientId: string;
  planId: string;
  paymentMethod?: PaymentMethod;
  paymentMode?: import('./types').PaymentMode;
  markAsPaid?: boolean;
  installments?: number;
  firstDueDate?: string;
}) {
  const { data } = await api.post<PatientPackage>('/packages/sell', payload);
  return data;
}

export async function fetchPatientPackages(patientId?: string) {
  const { data } = await api.get<PatientPackage[]>('/packages/patient-packages', {
    params: patientId ? { patientId } : undefined,
  });
  return data;
}

export async function fetchRenewalAlerts() {
  const { data } = await api.get<PatientPackage[]>('/packages/renewal-alerts');
  return data;
}

// ---------- Appointments ----------
export async function fetchAppointments(params: {
  from: string;
  to: string;
  professionalId?: string;
  patientId?: string;
}) {
  const { data } = await api.get<Appointment[]>('/appointments', { params });
  return data;
}

export async function createAppointmentSeries(payload: {
  patientId: string;
  professionalId: string;
  roomId?: string | null;
  packageId?: string | null;
  weekdays: number[];
  startTime: string;
  durationMinutes: number;
  firstDate: string;
  occurrences: number;
}) {
  const { data } = await api.post<Appointment[]>('/appointments/series', payload);
  return data;
}

export async function transitionAppointment(payload: {
  id: string;
  status: AppointmentStatus;
  absenceKind?: AbsenceKind | null;
  absenceNotes?: string | null;
  scheduleMakeupAt?: string | null;
}) {
  const { id, ...body } = payload;
  const { data } = await api.patch<Appointment>(`/appointments/${id}/status`, body);
  return data;
}

export async function sendAppointmentReminders(withinHours: number) {
  const { data } = await api.post<{ sent: number } | number>('/appointments/reminders', { withinHours });
  return data;
}

// ---------- Clinical ----------
export async function fetchClinicalRecords(patientId: string) {
  const { data } = await api.get<ClinicalRecord[]>(`/clinical/patients/${patientId}`);
  return data;
}

export async function fetchSessionNotes(patientId: string) {
  const { data } = await api.get<SessionNoteHistoryItem[]>(
    `/clinical/patients/${patientId}/session-notes`,
  );
  return data;
}

export async function createClinicalRecord(payload: {
  patientId: string;
  professionalId: string;
  chiefComplaint: string;
  anamnesis?: string | null;
  painScale?: number | null;
  assessment?: string | null;
  plan?: string | null;
}) {
  const { data } = await api.post<ClinicalRecord>('/clinical/records', payload);
  return data;
}

export async function createSessionNote(payload: {
  appointmentId: string;
  professionalId: string;
  subjective?: string | null;
  objective?: string | null;
  assessment?: string | null;
  plan?: string | null;
  markCompleted?: boolean;
}) {
  const { data } = await api.post<SessionNote>('/clinical/session-notes', payload);
  return data;
}

// ---------- Finance ----------
export async function fetchFinanceSummary() {
  const { data } = await api.get<import('./types').FinanceSummary>('/finance/summary');
  return data;
}

export async function fetchPayments(params?: { from?: string; to?: string; status?: PaymentStatus }) {
  const { data } = await api.get<Payment[]>('/finance/payments', { params });
  return data;
}

export async function createPayment(payload: {
  patientId: string;
  packageId?: string | null;
  amountCents: number;
  method: PaymentMethod;
  status?: PaymentStatus;
  dueDate?: string | null;
  notes?: string | null;
}) {
  const { data } = await api.post<Payment>('/finance/payments', payload);
  return data;
}

export async function settlePayment(payload: {
  id: string;
  method?: PaymentMethod;
  paidAt?: string;
  notes?: string | null;
}) {
  const { id, ...body } = payload;
  const { data } = await api.patch<Payment>(`/finance/payments/${id}/settle`, body);
  return data;
}

export async function fetchCommissionReport(params: { professionalId: string; from: string; to: string }) {
  const { data } = await api.get<CommissionReport>('/finance/commission', { params });
  return data;
}

// ---------- Plantão ----------
export async function fetchHospitals() {
  const { data } = await api.get<HospitalSite[]>('/plantao/hospitals');
  return data;
}

export async function createHospital(payload: { name: string; city?: string }) {
  const { data } = await api.post('/plantao/hospitals', payload);
  return data;
}

export async function createWard(payload: { hospitalSiteId: string; name: string }) {
  const { data } = await api.post('/plantao/wards', payload);
  return data;
}

export async function createBed(payload: { wardId: string; code: string }) {
  const { data } = await api.post('/plantao/beds', payload);
  return data;
}

export async function fetchFreeBeds(hospitalSiteId: string, wardId?: string) {
  const { data } = await api.get<HospitalBed[]>('/plantao/beds/free', {
    params: { hospitalSiteId, wardId },
  });
  return data;
}

export async function fetchAdmissions(params?: {
  hospitalSiteId?: string;
  status?: 'ACTIVE' | 'DISCHARGED';
}) {
  const { data } = await api.get<AdmissionDetail[]>('/plantao/admissions', { params });
  return data;
}

export async function fetchAdmission(id: string) {
  const { data } = await api.get<AdmissionDetail>(`/plantao/admissions/${id}`);
  return data;
}

export async function admitPatient(payload: {
  patientId: string;
  hospitalSiteId: string;
  bedId: string;
  hospitalMrn?: string;
  insuranceName?: string;
  reason?: string;
  diagnosis?: string;
  responsiblePhysician?: string;
  precautions?: Precautions;
  mobilityLevel?: string;
  assistanceNeeded?: string;
  initialGoals?: string;
}) {
  const { data } = await api.post<AdmissionDetail>('/plantao/admissions', payload);
  return data;
}

export async function updateAdmission(
  id: string,
  payload: Partial<{
    hospitalMrn: string | null;
    insuranceName: string | null;
    reason: string | null;
    diagnosis: string | null;
    responsiblePhysician: string | null;
    precautions: Precautions | null;
    mobilityLevel: string | null;
    assistanceNeeded: string | null;
    initialGoals: string | null;
    openPending: string | null;
  }>,
) {
  const { data } = await api.patch<AdmissionDetail>(`/plantao/admissions/${id}`, payload);
  return data;
}

export async function transferAdmission(id: string, bedId: string) {
  const { data } = await api.post<AdmissionDetail>(`/plantao/admissions/${id}/transfer`, { bedId });
  return data;
}

export async function dischargeAdmission(
  id: string,
  payload: { dischargeDestination: DischargeDestination; dischargeSummary?: string },
) {
  const { data } = await api.post<AdmissionDetail>(`/plantao/admissions/${id}/discharge`, payload);
  return data;
}

export async function fetchAdmissionEncounters(admissionId: string) {
  const { data } = await api.get<PlantaoEncounter[]>(`/plantao/admissions/${admissionId}/encounters`);
  return data;
}

export async function fetchOpenShift(hospitalSiteId?: string) {
  const { data } = await api.get<ShiftDetail | null>('/plantao/shifts/open', {
    params: hospitalSiteId ? { hospitalSiteId } : undefined,
  });
  return data;
}

export async function fetchShift(id: string) {
  const { data } = await api.get<ShiftDetail>(`/plantao/shifts/${id}`);
  return data;
}

export async function openShift(payload: {
  hospitalSiteId: string;
  startsAt: string;
  endsAt: string;
  wardIds?: string[];
  teamUserIds?: string[];
  notes?: string;
}) {
  const { data } = await api.post<ShiftDetail>('/plantao/shifts', payload);
  return data;
}

export async function updateCensusItem(
  id: string,
  payload: { priority?: CensusPriority; status?: CensusItemStatus; notes?: string | null },
) {
  const { data } = await api.patch<CensusItemDetail>(`/plantao/census/${id}`, payload);
  return data;
}

export async function createPlantaoEncounter(payload: {
  shiftId: string;
  admissionId: string;
  conduct: string;
  tags?: string[];
  response?: string;
  intercurrence?: string;
  painScale?: number;
  dyspneaScale?: number;
  mobilityAssist?: string;
  precautionsUpdate?: Precautions;
  pendingForNext?: string;
  markCensusDone?: boolean;
}) {
  const { data } = await api.post<PlantaoEncounter>('/plantao/encounters', payload);
  return data;
}

export async function closeShiftHandoff(
  shiftId: string,
  payload: { toUserId?: string; notes?: string },
) {
  const { data } = await api.post<Handoff>(`/plantao/shifts/${shiftId}/handoff`, payload);
  return data;
}

// ---------- Nutrição ----------
export async function fetchNutritionAnamneses(patientId: string) {
  const { data } = await api.get<NutritionAnamnesis[]>('/nutrition/anamneses', { params: { patientId } });
  return data;
}

export async function createNutritionAnamnesis(payload: {
  patientId: string;
  responses: Record<string, unknown>;
  recordedAt?: string;
}) {
  const { data } = await api.post<NutritionAnamnesis>('/nutrition/anamneses', payload);
  return data;
}

export async function fetchAnthropometry(patientId: string) {
  const { data } = await api.get<AnthropometricAssessment[]>('/nutrition/anthropometry', {
    params: { patientId },
  });
  return data;
}

export async function createAnthropometry(payload: {
  patientId: string;
  measuredAt?: string;
  weightKg: number;
  heightCm: number;
  circumferences?: Record<string, unknown>;
  skinfolds?: Record<string, unknown>;
  bodyFatProtocol?: string;
  bodyFatPct?: number;
  leanMassKg?: number;
  fatMassKg?: number;
  bioimpedance?: Record<string, unknown>;
  notes?: string;
}) {
  const { data } = await api.post<AnthropometricAssessment>('/nutrition/anthropometry', payload);
  return data;
}

export async function fetchEnergyCalculations(patientId: string) {
  const { data } = await api.get<EnergyCalculation[]>('/nutrition/energy', { params: { patientId } });
  return data;
}

export async function createEnergyCalculation(payload: {
  patientId: string;
  assessmentId?: string;
  formula: EnergyFormula;
  activityFactor: number;
  weightKg?: number;
  heightCm?: number;
  sex?: BiologicalSex;
  customBmrKcal?: number;
  targetKcal?: number;
  kcalAdjustment?: number;
  carbPct: number;
  proteinPct: number;
  fatPct: number;
  proteinGPerKg?: number;
  notes?: string;
}) {
  const { data } = await api.post<EnergyCalculation>('/nutrition/energy', payload);
  return data;
}

export async function searchFoods(q: string, limit = 15) {
  const { data } = await api.get<FoodItem[]>('/nutrition/foods', { params: { q, limit } });
  return data;
}

export async function createCustomFood(payload: {
  name: string;
  category?: string;
  kcalPer100g: number;
  carbsPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  fiberPer100g?: number;
  measures?: { label: string; grams: number }[];
}) {
  const { data } = await api.post<FoodItem>('/nutrition/foods', payload);
  return data;
}

export async function fetchMealPlans(params?: { patientId?: string; status?: MealPlanStatus }) {
  const { data } = await api.get<MealPlan[]>('/nutrition/meal-plans', { params });
  return data;
}

export async function fetchMealPlan(id: string) {
  const { data } = await api.get<MealPlanDetail>(`/nutrition/meal-plans/${id}`);
  return data;
}

export async function createMealPlan(payload: CreateMealPlanPayload) {
  const { data } = await api.post<MealPlanDetail>('/nutrition/meal-plans', payload);
  return data;
}

export async function activateMealPlan(id: string) {
  const { data } = await api.post<MealPlanDetail>(`/nutrition/meal-plans/${id}/activate`);
  return data;
}

export async function cloneMealPlan(id: string, payload: { title?: string; patientId?: string } = {}) {
  const { data } = await api.post<MealPlanDetail>(`/nutrition/meal-plans/${id}/clone`, payload);
  return data;
}

export async function recalcMealPlan(id: string) {
  const { data } = await api.post<MealPlanDetail>(`/nutrition/meal-plans/${id}/recalc`);
  return data;
}

export async function fetchNutritionEvolutions(patientId: string) {
  const { data } = await api.get<NutritionEvolution[]>('/nutrition/evolutions', { params: { patientId } });
  return data;
}

export async function createNutritionEvolution(payload: {
  patientId: string;
  format?: NutritionEvolutionFormat;
  assessment?: string;
  nutritionDiagnosis?: string;
  intervention?: string;
  monitoringEvaluation?: string;
}) {
  const { data } = await api.post<NutritionEvolution>('/nutrition/evolutions', payload);
  return data;
}

export async function fetchGoals(patientId: string) {
  const { data } = await api.get<PatientGoal[]>('/nutrition/goals', { params: { patientId } });
  return data;
}

export async function createGoal(payload: {
  patientId: string;
  title: string;
  metricType: string;
  targetValue?: string;
  currentValue?: string;
  dueDate?: string;
  status?: GoalStatus;
}) {
  const { data } = await api.post<PatientGoal>('/nutrition/goals', payload);
  return data;
}
