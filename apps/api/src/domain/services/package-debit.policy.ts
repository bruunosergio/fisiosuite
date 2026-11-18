import { AbsenceKind, AppointmentStatus } from '../entities';
import type { Clinic } from '../entities';

/**
 * Decide se a transição de status deve debitar uma sessão do pacote.
 * Regras configuráveis por clínica (política comercial).
 */
export function shouldDebitPackage(params: {
  clinic: Clinic;
  previousStatus: AppointmentStatus;
  nextStatus: AppointmentStatus;
  absenceKind: AbsenceKind | null;
  alreadyDebited: boolean;
  isMakeup: boolean;
}): boolean {
  const { clinic, previousStatus, nextStatus, absenceKind, alreadyDebited, isMakeup } = params;

  if (alreadyDebited) return false;
  if (
    previousStatus === AppointmentStatus.COMPLETED ||
    previousStatus === AppointmentStatus.NO_SHOW
  ) {
    return false;
  }

  if (nextStatus === AppointmentStatus.COMPLETED) {
    // Reposição normalmente já foi debitada na falta original (quando política desconta).
    // Se a falta NÃO debitou, a reposição debita.
    if (isMakeup) {
      return true;
    }
    return true;
  }

  if (nextStatus === AppointmentStatus.NO_SHOW) {
    if (absenceKind === AbsenceKind.CLINIC_CANCELLED) return false;
    if (absenceKind === AbsenceKind.JUSTIFIED) {
      return clinic.justifiedDebitsPackage;
    }
    // UNJUSTIFIED ou null → usa política de não justificada
    return clinic.unjustifiedDebitsPackage;
  }

  return false;
}

export function isJustifiedByNotice(params: {
  startsAt: Date;
  cancelledAt: Date;
  noticeHours: number;
}): boolean {
  const diffMs = params.startsAt.getTime() - params.cancelledAt.getTime();
  const hours = diffMs / (1000 * 60 * 60);
  return hours >= params.noticeHours;
}
