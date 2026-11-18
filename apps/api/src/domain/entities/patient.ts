export type Patient = {
  id: string;
  clinicId: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  cpf: string | null;
  birthDate: Date | null;
  notes: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};
