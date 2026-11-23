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

export enum BedStatus {
  FREE = 'FREE',
  OCCUPIED = 'OCCUPIED',
  BLOCKED = 'BLOCKED',
}

export enum AdmissionStatus {
  ACTIVE = 'ACTIVE',
  DISCHARGED = 'DISCHARGED',
}

export enum DischargeDestination {
  HOME = 'HOME',
  TRANSFER = 'TRANSFER',
  DEATH = 'DEATH',
  OTHER_WARD = 'OTHER_WARD',
  OTHER = 'OTHER',
}

export enum ShiftStatus {
  OPEN = 'OPEN',
  HANDOFF = 'HANDOFF',
  CLOSED = 'CLOSED',
}

export enum CensusPriority {
  CRITICAL = 'CRITICAL',
  WATCH = 'WATCH',
  STABLE = 'STABLE',
}

export enum CensusItemStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  CONTRAINDICATED = 'CONTRAINDICATED',
  DISCHARGED_TODAY = 'DISCHARGED_TODAY',
}

export enum Specialty {
  FISIOTERAPIA = 'FISIOTERAPIA',
  NUTRICAO = 'NUTRICAO',
}

export enum CouncilType {
  CREFITO = 'CREFITO',
  CRN = 'CRN',
  OTHER = 'OTHER',
}

export enum BiologicalSex {
  FEMALE = 'FEMALE',
  MALE = 'MALE',
  UNSPECIFIED = 'UNSPECIFIED',
}

export enum FoodSource {
  TACO = 'TACO',
  TBCA = 'TBCA',
  CUSTOM = 'CUSTOM',
}

export enum MealPlanMode {
  QUANTITATIVE = 'QUANTITATIVE',
  EQUIVALENTS = 'EQUIVALENTS',
  QUALITATIVE = 'QUALITATIVE',
}

export enum MealPlanStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum EnergyFormula {
  MIFFLIN = 'MIFFLIN',
  HARRIS_BENEDICT = 'HARRIS_BENEDICT',
  FAO_WHO = 'FAO_WHO',
  CUSTOM = 'CUSTOM',
}

export enum NutritionEvolutionFormat {
  ADIME = 'ADIME',
  SOAP = 'SOAP',
}
