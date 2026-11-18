export enum Role {
  ADMIN = 'ADMIN',
  RECEPTION = 'RECEPTION',
  PROFESSIONAL = 'PROFESSIONAL',
}

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
  CANCELLED = 'CANCELLED',
}

export enum PackageStatus {
  ACTIVE = 'ACTIVE',
  EXHAUSTED = 'EXHAUSTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  PIX = 'PIX',
  CARD = 'CARD',
  BOLETO = 'BOLETO',
  OTHER = 'OTHER',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  CANCELLED = 'CANCELLED',
}

export enum AbsenceKind {
  JUSTIFIED = 'JUSTIFIED',
  UNJUSTIFIED = 'UNJUSTIFIED',
  CLINIC_CANCELLED = 'CLINIC_CANCELLED',
}
