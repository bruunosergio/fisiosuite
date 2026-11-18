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
  Role,
  Room,
  SessionNote,
  SessionNoteHistoryItem,
  User,
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
