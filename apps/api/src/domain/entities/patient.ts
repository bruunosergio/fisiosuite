import type { BiologicalSex } from './enums';

export type Patient = {
  id: string;
  clinicId: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  cpf: string | null;
  birthDate: Date | null;
  biologicalSex: BiologicalSex | null;
  allergiesSummary: string | null;
  dietaryRestrictions: string | null;
  notes: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};
