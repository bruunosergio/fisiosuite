export type Role = 'ADMIN' | 'RECEPTION' | 'PROFESSIONAL';

export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';

export type PackageStatus = 'ACTIVE' | 'EXHAUSTED' | 'EXPIRED' | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'PIX' | 'CARD' | 'BOLETO' | 'OTHER';

export type PaymentStatus = 'PENDING' | 'PAID' | 'PARTIAL' | 'CANCELLED';

export type AbsenceKind = 'JUSTIFIED' | 'UNJUSTIFIED' | 'CLINIC_CANCELLED';

export type Specialty = 'FISIOTERAPIA' | 'NUTRICAO';
export type CouncilType = 'CREFITO' | 'CRN' | 'OTHER';
export type BiologicalSex = 'FEMALE' | 'MALE' | 'UNSPECIFIED';

export type User = {
  id: string;
  clinicId: string;
  name: string;
  email: string;
  role: Role;
  commissionPct: number | null;
  specialty?: Specialty | null;
  councilType?: CouncilType | null;
  councilNumber?: string | null;
  councilState?: string | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type AuthResponse = {
  accessToken: string;
  user: User;
  enabledModules?: Specialty[];
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
  biologicalSex?: BiologicalSex | null;
  allergiesSummary?: string | null;
  dietaryRestrictions?: string | null;
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

export type BedStatus = 'FREE' | 'OCCUPIED' | 'BLOCKED';
export type AdmissionStatus = 'ACTIVE' | 'DISCHARGED';
export type DischargeDestination = 'HOME' | 'TRANSFER' | 'DEATH' | 'OTHER_WARD' | 'OTHER';
export type ShiftStatus = 'OPEN' | 'HANDOFF' | 'CLOSED';
export type CensusPriority = 'CRITICAL' | 'WATCH' | 'STABLE';
export type CensusItemStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'DONE'
  | 'CONTRAINDICATED'
  | 'DISCHARGED_TODAY';

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

export type HospitalBed = {
  id: string;
  wardId: string;
  code: string;
  status: BedStatus;
  active: boolean;
};

export type HospitalWard = {
  id: string;
  hospitalSiteId: string;
  name: string;
  active: boolean;
  beds: HospitalBed[];
};

export type HospitalSite = {
  id: string;
  clinicId: string;
  name: string;
  city: string | null;
  active: boolean;
  wards: HospitalWard[];
};

export type AdmissionDetail = {
  id: string;
  clinicId: string;
  patientId: string;
  hospitalSiteId: string;
  bedId: string;
  hospitalMrn: string | null;
  insuranceName: string | null;
  admittedAt: string;
  reason: string | null;
  diagnosis: string | null;
  responsiblePhysician: string | null;
  expectedDischargeAt: string | null;
  precautions: Precautions | null;
  mobilityLevel: string | null;
  assistanceNeeded: string | null;
  initialGoals: string | null;
  openPending: string | null;
  status: AdmissionStatus;
  dischargedAt: string | null;
  dischargeDestination: DischargeDestination | null;
  dischargeSummary: string | null;
  patientName: string;
  patientBirthDate: string | null;
  bedCode: string;
  wardId: string;
  wardName: string;
  hospitalName: string;
};

export type CensusItemDetail = {
  id: string;
  shiftId: string;
  admissionId: string;
  priority: CensusPriority;
  status: CensusItemStatus;
  notes: string | null;
  admission: AdmissionDetail;
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
  confirmedAt: string;
};

export type ShiftDetail = {
  id: string;
  clinicId: string;
  hospitalSiteId: string;
  openedById: string;
  startsAt: string;
  endsAt: string;
  wardIds: string[];
  status: ShiftStatus;
  notes: string | null;
  hospitalName: string;
  teamUserIds: string[];
  census: CensusItemDetail[];
  handoff?: Handoff | null;
};

export type PlantaoEncounter = {
  id: string;
  clinicId: string;
  shiftId: string;
  admissionId: string;
  professionalId: string;
  conductedAt: string;
  conduct: string;
  tags: string[];
  response: string | null;
  intercurrence: string | null;
  painScale: number | null;
  dyspneaScale: number | null;
  mobilityAssist: string | null;
  precautionsUpdate: Precautions | null;
  pendingForNext: string | null;
};

// ---------- Nutrição ----------
export type EnergyFormula = 'MIFFLIN' | 'HARRIS_BENEDICT' | 'FAO_WHO' | 'CUSTOM';
export type FoodSource = 'TACO' | 'TBCA' | 'CUSTOM';
export type MealPlanMode = 'QUANTITATIVE' | 'EQUIVALENTS' | 'QUALITATIVE';
export type MealPlanStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type NutritionEvolutionFormat = 'ADIME' | 'SOAP';
export type GoalStatus = 'OPEN' | 'ACHIEVED' | 'CANCELLED';

export type NutritionAnamnesis = {
  id: string;
  clinicId: string;
  patientId: string;
  professionalId: string;
  responses: Record<string, unknown>;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type AnthropometricAssessment = {
  id: string;
  clinicId: string;
  patientId: string;
  professionalId: string;
  measuredAt: string;
  weightKg: number;
  heightCm: number;
  bmi: number | null;
  circumferences: Record<string, unknown> | null;
  skinfolds: Record<string, unknown> | null;
  bodyFatProtocol: string | null;
  bodyFatPct: number | null;
  leanMassKg: number | null;
  fatMassKg: number | null;
  bioimpedance: Record<string, unknown> | null;
  notes: string | null;
  createdAt: string;
};

export type EnergyCalculation = {
  id: string;
  clinicId: string;
  patientId: string;
  professionalId: string;
  assessmentId: string | null;
  formula: EnergyFormula;
  activityFactor: number;
  bmrKcal: number;
  tdeeKcal: number;
  targetKcal: number;
  carbPct: number;
  proteinPct: number;
  fatPct: number;
  proteinGPerKg: number | null;
  notes: string | null;
  createdAt: string;
  macros: { carbsG: number; proteinG: number; fatG: number };
};

export type NutrientSnapshot = {
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
};

export type FoodMeasure = {
  id: string;
  foodItemId: string;
  label: string;
  grams: number;
};

export type FoodItem = {
  id: string;
  clinicId: string | null;
  source: FoodSource;
  sourceCode: string | null;
  name: string;
  category: string | null;
  kcalPer100g: number;
  carbsPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  fiberPer100g: number | null;
  active: boolean;
  measures: FoodMeasure[];
};

export type MealSubstitution = {
  id: string;
  mealItemId: string;
  substituteFoodItemId: string | null;
  measureLabel: string;
  quantity: number;
  grams: number;
  notes: string | null;
};

export type MealItem = {
  id: string;
  mealId: string;
  foodItemId: string | null;
  customLabel: string | null;
  measureLabel: string;
  quantity: number;
  grams: number;
  nutrientsSnapshot: NutrientSnapshot;
  sortOrder: number;
  substitutions: MealSubstitution[];
};

export type Meal = {
  id: string;
  mealPlanId: string;
  name: string;
  scheduledTime: string | null;
  sortOrder: number;
  notes: string | null;
  items: MealItem[];
};

export type MealPlan = {
  id: string;
  clinicId: string;
  patientId: string;
  professionalId: string;
  title: string;
  objective: string | null;
  mode: MealPlanMode;
  status: MealPlanStatus;
  targetKcal: number | null;
  calculatedTotals: NutrientSnapshot | null;
  generalNotes: string | null;
  clonedFromId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MealPlanDetail = MealPlan & { meals: Meal[] };

export type NutritionEvolution = {
  id: string;
  clinicId: string;
  patientId: string;
  professionalId: string;
  format: NutritionEvolutionFormat;
  assessment: string | null;
  nutritionDiagnosis: string | null;
  intervention: string | null;
  monitoringEvaluation: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PatientGoal = {
  id: string;
  clinicId: string;
  patientId: string;
  professionalId: string;
  title: string;
  metricType: string;
  targetValue: string | null;
  currentValue: string | null;
  dueDate: string | null;
  status: GoalStatus | string;
  createdAt: string;
  updatedAt: string;
};

export type MealPlanSubstitutionInput = {
  substituteFoodItemId?: string;
  measureLabel: string;
  quantity: number;
  grams?: number;
  notes?: string;
};

export type MealPlanItemInput = {
  foodItemId?: string;
  customLabel?: string;
  measureLabel: string;
  quantity: number;
  grams?: number;
  nutrients?: Partial<NutrientSnapshot>;
  substitutions?: MealPlanSubstitutionInput[];
};

export type MealPlanMealInput = {
  name: string;
  scheduledTime?: string;
  notes?: string;
  items?: MealPlanItemInput[];
};

export type CreateMealPlanPayload = {
  patientId: string;
  title: string;
  objective?: string;
  mode?: MealPlanMode;
  targetKcal?: number;
  generalNotes?: string;
  meals?: MealPlanMealInput[];
};
