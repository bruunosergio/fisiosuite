import { AbsenceKind, AppointmentStatus, Specialty } from '../entities';
import { shouldDebitPackage, isJustifiedByNotice } from '../services/package-debit.policy';
import type { Clinic } from '../entities';

const baseClinic: Clinic = {
  id: 'c1',
  name: 'Demo',
  document: null,
  phone: null,
  timezone: 'America/Sao_Paulo',
  absenceNoticeHours: 24,
  justifiedDebitsPackage: false,
  unjustifiedDebitsPackage: true,
  commissionOnNoShow: false,
  commissionOnMakeup: false,
  enabledModules: [Specialty.FISIOTERAPIA],
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('shouldDebitPackage', () => {
  it('debita na presença (COMPLETED)', () => {
    expect(
      shouldDebitPackage({
        clinic: baseClinic,
        previousStatus: AppointmentStatus.SCHEDULED,
        nextStatus: AppointmentStatus.COMPLETED,
        absenceKind: null,
        alreadyDebited: false,
        isMakeup: false,
      }),
    ).toBe(true);
  });

  it('não debita falta justificada quando política da clínica desliga', () => {
    expect(
      shouldDebitPackage({
        clinic: baseClinic,
        previousStatus: AppointmentStatus.CONFIRMED,
        nextStatus: AppointmentStatus.NO_SHOW,
        absenceKind: AbsenceKind.JUSTIFIED,
        alreadyDebited: false,
        isMakeup: false,
      }),
    ).toBe(false);
  });

  it('debita falta não justificada', () => {
    expect(
      shouldDebitPackage({
        clinic: baseClinic,
        previousStatus: AppointmentStatus.SCHEDULED,
        nextStatus: AppointmentStatus.NO_SHOW,
        absenceKind: AbsenceKind.UNJUSTIFIED,
        alreadyDebited: false,
        isMakeup: false,
      }),
    ).toBe(true);
  });

  it('não debita duas vezes', () => {
    expect(
      shouldDebitPackage({
        clinic: baseClinic,
        previousStatus: AppointmentStatus.SCHEDULED,
        nextStatus: AppointmentStatus.COMPLETED,
        absenceKind: null,
        alreadyDebited: true,
        isMakeup: false,
      }),
    ).toBe(false);
  });
});

describe('isJustifiedByNotice', () => {
  it('considera justificada com 24h+ de antecedência', () => {
    const startsAt = new Date('2026-11-10T10:00:00');
    const cancelledAt = new Date('2026-11-09T09:00:00');
    expect(isJustifiedByNotice({ startsAt, cancelledAt, noticeHours: 24 })).toBe(true);
  });

  it('não justifica com pouca antecedência', () => {
    const startsAt = new Date('2026-11-10T10:00:00');
    const cancelledAt = new Date('2026-11-10T08:00:00');
    expect(isJustifiedByNotice({ startsAt, cancelledAt, noticeHours: 24 })).toBe(false);
  });
});
