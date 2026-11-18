import { Injectable } from '@nestjs/common';
import type { Payment, PaymentStatus } from '../../domain/entities';
import type { PaymentRepository } from '../../domain/ports/output';
import { PrismaService } from '../database/prisma.service';
import { mapPayment } from '../mappers/domain.mappers';

@Injectable()
export class PrismaPaymentRepository implements PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(payment: Payment): Promise<Payment> {
    const row = await this.prisma.payment.create({
      data: {
        id: payment.id,
        clinicId: payment.clinicId,
        patientId: payment.patientId,
        packageId: payment.packageId,
        amountCents: payment.amountCents,
        method: payment.method,
        status: payment.status,
        dueDate: payment.dueDate,
        installmentNumber: payment.installmentNumber,
        installmentTotal: payment.installmentTotal,
        paidAt: payment.paidAt,
        notes: payment.notes,
        createdAt: payment.createdAt,
      },
    });
    return mapPayment(row);
  }

  async listByClinic(
    clinicId: string,
    from?: Date,
    to?: Date,
    status?: PaymentStatus,
  ): Promise<Payment[]> {
    const rows = await this.prisma.payment.findMany({
      where: {
        clinicId,
        ...(status ? { status } : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });
    return rows.map(mapPayment);
  }

  async update(payment: Payment): Promise<Payment> {
    const row = await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: payment.status,
        paidAt: payment.paidAt,
        notes: payment.notes,
        method: payment.method,
        amountCents: payment.amountCents,
        dueDate: payment.dueDate,
        installmentNumber: payment.installmentNumber,
        installmentTotal: payment.installmentTotal,
      },
    });
    return mapPayment(row);
  }

  async findById(clinicId: string, id: string): Promise<Payment | null> {
    const row = await this.prisma.payment.findFirst({ where: { id, clinicId } });
    return row ? mapPayment(row) : null;
  }
}
