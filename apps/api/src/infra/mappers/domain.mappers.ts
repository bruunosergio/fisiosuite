import type {
  Appointment as PrismaAppointment,
  ClinicalRecord as PrismaClinicalRecord,
  Clinic as PrismaClinic,
  PackagePlan as PrismaPackagePlan,
  Patient as PrismaPatient,
  PatientPackage as PrismaPatientPackage,
  Payment as PrismaPayment,
  Room as PrismaRoom,
  SessionNote as PrismaSessionNote,
  User as PrismaUser,
} from '@prisma/client';
import type {
  Appointment,
  ClinicalRecord,
  Clinic,
  PackagePlan,
  PainMap,
  Patient,
  PatientPackage,
  Payment,
  Room,
  SessionNote,
  User,
} from '../../domain/entities';

export function mapClinic(row: PrismaClinic): Clinic {
  return {
    id: row.id,
    name: row.name,
    document: row.document,
    phone: row.phone,
    timezone: row.timezone,
    absenceNoticeHours: row.absenceNoticeHours,
    justifiedDebitsPackage: row.justifiedDebitsPackage,
    unjustifiedDebitsPackage: row.unjustifiedDebitsPackage,
    commissionOnNoShow: row.commissionOnNoShow,
    commissionOnMakeup: row.commissionOnMakeup,
    active: row.active,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapUser(row: PrismaUser): User {
  return {
    id: row.id,
    clinicId: row.clinicId,
    name: row.name,
    email: row.email,
    passwordHash: row.passwordHash,
    role: row.role as User['role'],
    commissionPct: row.commissionPct == null ? null : Number(row.commissionPct),
    active: row.active,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapPatient(row: PrismaPatient): Patient {
  return {
    id: row.id,
    clinicId: row.clinicId,
    name: row.name,
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    cpf: row.cpf,
    birthDate: row.birthDate,
    notes: row.notes,
    active: row.active,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapRoom(row: PrismaRoom): Room {
  return {
    id: row.id,
    clinicId: row.clinicId,
    name: row.name,
    capacity: row.capacity,
    active: row.active,
    createdAt: row.createdAt,
  };
}

export function mapPackagePlan(row: PrismaPackagePlan): PackagePlan {
  return {
    id: row.id,
    clinicId: row.clinicId,
    name: row.name,
    sessionCount: row.sessionCount,
    priceCents: row.priceCents,
    validityDays: row.validityDays,
    active: row.active,
    createdAt: row.createdAt,
  };
}

export function mapPatientPackage(row: PrismaPatientPackage): PatientPackage {
  return {
    id: row.id,
    clinicId: row.clinicId,
    patientId: row.patientId,
    planId: row.planId,
    totalSessions: row.totalSessions,
    usedSessions: row.usedSessions,
    status: row.status as PatientPackage['status'],
    purchasedAt: row.purchasedAt,
    expiresAt: row.expiresAt,
    priceCents: row.priceCents,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapAppointment(row: PrismaAppointment): Appointment {
  return {
    id: row.id,
    clinicId: row.clinicId,
    patientId: row.patientId,
    professionalId: row.professionalId,
    roomId: row.roomId,
    packageId: row.packageId,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    status: row.status as Appointment['status'],
    seriesId: row.seriesId,
    makeupOfId: row.makeupOfId,
    absenceKind: row.absenceKind as Appointment['absenceKind'],
    absenceNotes: row.absenceNotes,
    packageDebited: row.packageDebited,
    confirmationSentAt: row.confirmationSentAt,
    confirmedAt: row.confirmedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapClinicalRecord(row: PrismaClinicalRecord): ClinicalRecord {
  return {
    id: row.id,
    clinicId: row.clinicId,
    patientId: row.patientId,
    professionalId: row.professionalId,
    chiefComplaint: row.chiefComplaint,
    anamnesis: row.anamnesis,
    painMap: (row.painMap as PainMap | null) ?? null,
    painScale: row.painScale,
    assessment: row.assessment,
    plan: row.plan,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapSessionNote(row: PrismaSessionNote): SessionNote {
  return {
    id: row.id,
    appointmentId: row.appointmentId,
    professionalId: row.professionalId,
    subjective: row.subjective,
    objective: row.objective,
    assessment: row.assessment,
    plan: row.plan,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapPayment(row: PrismaPayment): Payment {
  return {
    id: row.id,
    clinicId: row.clinicId,
    patientId: row.patientId,
    packageId: row.packageId,
    amountCents: row.amountCents,
    method: row.method as Payment['method'],
    status: row.status as Payment['status'],
    dueDate: row.dueDate,
    installmentNumber: row.installmentNumber,
    installmentTotal: row.installmentTotal,
    paidAt: row.paidAt,
    notes: row.notes,
    createdAt: row.createdAt,
  };
}
