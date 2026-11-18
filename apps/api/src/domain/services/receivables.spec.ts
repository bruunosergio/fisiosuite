import { PaymentStatus } from '../entities';
import { isOverdue, splitInstallments, type Payment } from '../entities/payment';

describe('splitInstallments', () => {
  it('divide 10000 em 3 parcelas com resto na última', () => {
    expect(splitInstallments(10000, 3)).toEqual([3333, 3333, 3334]);
  });

  it('1 parcela = valor total', () => {
    expect(splitInstallments(120000, 1)).toEqual([120000]);
  });
});

describe('isOverdue', () => {
  const base: Payment = {
    id: '1',
    clinicId: 'c',
    patientId: 'p',
    packageId: null,
    amountCents: 1000,
    method: 'PIX' as Payment['method'],
    status: PaymentStatus.PENDING,
    dueDate: new Date('2026-01-01'),
    installmentNumber: 1,
    installmentTotal: 1,
    paidAt: null,
    notes: null,
    createdAt: new Date(),
  };

  it('pendente com vencimento passado é vencido', () => {
    expect(isOverdue(base, new Date('2026-02-01'))).toBe(true);
  });

  it('pago nunca é vencido', () => {
    expect(isOverdue({ ...base, status: PaymentStatus.PAID }, new Date('2026-02-01'))).toBe(false);
  });
});
