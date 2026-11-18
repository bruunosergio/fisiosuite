import type { Payment, PaymentStatus } from '../../entities';

export interface PaymentRepository {
  create(payment: Payment): Promise<Payment>;
  listByClinic(
    clinicId: string,
    from?: Date,
    to?: Date,
    status?: PaymentStatus,
  ): Promise<Payment[]>;
  update(payment: Payment): Promise<Payment>;
  findById(clinicId: string, id: string): Promise<Payment | null>;
}
