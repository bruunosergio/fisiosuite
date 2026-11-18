export type Role = 'ADMIN' | 'RECEPTION' | 'PROFESSIONAL';

export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';

export type PackageStatus = 'ACTIVE' | 'EXHAUSTED' | 'EXPIRED' | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'PIX' | 'CARD' | 'BOLETO' | 'OTHER';

export type PaymentStatus = 'PENDING' | 'PAID' | 'PARTIAL' | 'CANCELLED';

export type AbsenceKind = 'JUSTIFIED' | 'UNJUSTIFIED' | 'CLINIC_CANCELLED';

export type User = {
  id: string;
  clinicId: string;
  name: string;
  email: string;
  role: Role;
  commissionPct: number | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type AuthResponse = {
  accessToken: string;
  user: User;
};

export type PlatformAdmin = {
  email: string;
  name: string;
  role: 'PLATFORM_ADMIN';
};

export type PlatformAuthResponse = {
  accessToken: string;
  admin: PlatformAdmin;
};

export type PlatformOverview = {
  clinicCount: number;
  activeClinicCount: number;
  userCount: number;
  patientCount: number;
};

export type PlatformClinicSummary = {
  id: string;
  name: string;
  document: string | null;
  phone: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  userCount: number;
  patientCount: number;
  appointmentCount: number;
  adminEmail: string | null;
};

export type PlatformClinicDetail = PlatformClinicSummary & {
  timezone: string;
  users: User[];
};

export type Patient = {
  id: string;
  clinicId: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  cpf: string | null;
  birthDate: string | null;
  notes: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Room = {
  id: string;
  clinicId: string;
  name: string;
  capacity: number;
  active: boolean;
  createdAt?: string;
};

export type PackagePlan = {
  id: string;
  clinicId: string;
  name: string;
  sessionCount: number;
  priceCents: number;
  validityDays: number | null;
  active: boolean;
  createdAt?: string;
};

export type PatientPackage = {
  id: string;
  clinicId: string;
  patientId: string;
  planId: string;
  totalSessions: number;
  usedSessions: number;
  status: PackageStatus;
  purchasedAt: string;
  expiresAt: string | null;
  priceCents: number;
  createdAt?: string;
  updatedAt?: string;
};

export type Appointment = {
  id: string;
  clinicId: string;
  patientId: string;
  professionalId: string;
  roomId: string | null;
  packageId: string | null;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  seriesId: string | null;
  makeupOfId: string | null;
  absenceKind: AbsenceKind | null;
  absenceNotes: string | null;
  packageDebited: boolean;
  confirmationSentAt: string | null;
  confirmedAt: string | null;
  // Campos opcionais que a API pode retornar já enriquecidos com nomes
  patientName?: string;
  professionalName?: string;
  roomName?: string;
};

export type PainMap = {
  regions: Array<{ id: string; intensity: number; note?: string }>;
};

export type ClinicalRecord = {
  id: string;
  clinicId: string;
  patientId: string;
  professionalId: string;
  chiefComplaint: string;
  anamnesis: string | null;
  painMap: PainMap | null;
  painScale: number | null;
  assessment: string | null;
  plan: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type SessionNote = {
  id: string;
  appointmentId: string;
  professionalId: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type SessionNoteHistoryItem = SessionNote & {
  patientId: string;
  appointmentStartsAt: string;
  appointmentStatus: AppointmentStatus | string;
};

export type PaymentMode = 'PAID_NOW' | 'ON_ACCOUNT' | 'INSTALLMENTS';

export type Payment = {
  id: string;
  clinicId: string;
  patientId: string;
  packageId: string | null;
  amountCents: number;
  method: PaymentMethod;
  status: PaymentStatus;
  dueDate: string | null;
  installmentNumber: number | null;
  installmentTotal: number | null;
  paidAt: string | null;
  notes: string | null;
  createdAt?: string;
};

export type FinanceSummary = {
  receivedCents: number;
  pendingCents: number;
  overdueCents: number;
  pendingCount: number;
  overdueCount: number;
};

export type CommissionLine = {
  appointmentId: string;
  startsAt: string;
  status: string;
  isMakeup: boolean;
  sessionPriceCents: number;
  commissionCents: number;
};

export type CommissionReport = {
  professionalId: string;
  professionalName: string;
  commissionPct: number;
  lines: CommissionLine[];
  totalCommissionCents: number;
};
