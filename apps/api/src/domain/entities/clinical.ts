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
  createdAt: Date;
  updatedAt: Date;
};

export type SessionNote = {
  id: string;
  appointmentId: string;
  professionalId: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Evolução enriquecida com dados do agendamento para histórico do prontuário. */
export type SessionNoteHistoryItem = SessionNote & {
  patientId: string;
  appointmentStartsAt: Date;
  appointmentStatus: string;
};
