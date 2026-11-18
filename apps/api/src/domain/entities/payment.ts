import { PaymentMethod, PaymentStatus } from './enums';

export type Payment = {
  id: string;
  clinicId: string;
  patientId: string;
  packageId: string | null;
  amountCents: number;
  method: PaymentMethod;
  status: PaymentStatus;
  dueDate: Date | null;
  installmentNumber: number | null;
  installmentTotal: number | null;
  paidAt: Date | null;
  notes: string | null;
  createdAt: Date;
};

export type PaymentMode = 'PAID_NOW' | 'ON_ACCOUNT' | 'INSTALLMENTS';

export function isOverdue(payment: Payment, today = new Date()): boolean {
  if (payment.status !== PaymentStatus.PENDING && payment.status !== PaymentStatus.PARTIAL) {
    return false;
  }
  if (!payment.dueDate) return false;
  const due = new Date(payment.dueDate);
  due.setHours(23, 59, 59, 999);
  return due.getTime() < today.getTime();
}

/** Divide valor em N parcelas (centavos), ajustando o resto na última. */
export function splitInstallments(totalCents: number, count: number): number[] {
  if (count < 1) return [totalCents];
  const base = Math.floor(totalCents / count);
  const parts = Array.from({ length: count }, () => base);
  const remainder = totalCents - base * count;
  parts[count - 1] += remainder;
  return parts;
}
