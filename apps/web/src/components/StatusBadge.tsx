import { Badge } from './ui';
import type { AppointmentStatus, PackageStatus, PaymentStatus } from '../lib/types';

type Tone = 'slate' | 'teal' | 'amber' | 'rose' | 'emerald' | 'sky';

const APPOINTMENT_LABELS: Record<AppointmentStatus, { label: string; tone: Tone }> = {
  SCHEDULED: { label: 'Agendado', tone: 'sky' },
  CONFIRMED: { label: 'Confirmado', tone: 'teal' },
  COMPLETED: { label: 'Concluído', tone: 'emerald' },
  NO_SHOW: { label: 'Falta', tone: 'rose' },
  CANCELLED: { label: 'Cancelado', tone: 'slate' },
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const config = APPOINTMENT_LABELS[status];
  return <Badge tone={config.tone}>{config.label}</Badge>;
}

const PACKAGE_LABELS: Record<PackageStatus, { label: string; tone: Tone }> = {
  ACTIVE: { label: 'Ativo', tone: 'emerald' },
  EXHAUSTED: { label: 'Esgotado', tone: 'amber' },
  EXPIRED: { label: 'Expirado', tone: 'rose' },
  CANCELLED: { label: 'Cancelado', tone: 'slate' },
};

export function PackageStatusBadge({ status }: { status: PackageStatus }) {
  const config = PACKAGE_LABELS[status];
  return <Badge tone={config.tone}>{config.label}</Badge>;
}

const PAYMENT_LABELS: Record<PaymentStatus, { label: string; tone: Tone }> = {
  PENDING: { label: 'Pendente', tone: 'amber' },
  PAID: { label: 'Pago', tone: 'emerald' },
  PARTIAL: { label: 'Parcial', tone: 'sky' },
  CANCELLED: { label: 'Cancelado', tone: 'slate' },
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const config = PAYMENT_LABELS[status];
  return <Badge tone={config.tone}>{config.label}</Badge>;
}
