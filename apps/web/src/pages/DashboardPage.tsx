import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, Lightbulb, RefreshCcw } from 'lucide-react';
import { fetchAppointments, fetchRenewalAlerts } from '../lib/queries';
import { Card, PageHeader, Spinner } from '../components/ui';
import { AppointmentStatusBadge } from '../components/StatusBadge';
import { formatTime } from '../lib/format';

function startAndEndOfToday() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

export default function DashboardPage() {
  const { from, to } = startAndEndOfToday();

  const appointmentsQuery = useQuery({
    queryKey: ['appointments', 'today', from, to],
    queryFn: () => fetchAppointments({ from, to }),
  });

  const renewalQuery = useQuery({
    queryKey: ['packages', 'renewal-alerts'],
    queryFn: fetchRenewalAlerts,
  });

  const todayAppointments = appointmentsQuery.data ?? [];
  const sortedToday = [...todayAppointments].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Hoje é ${new Date().toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
        })}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Agendamentos hoje</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <CalendarCheck className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {appointmentsQuery.isLoading ? <Spinner /> : sortedToday.length}
          </p>
          <p className="mt-1 text-xs text-slate-400">Sessões marcadas para o dia de hoje</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Alertas de renovação</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <RefreshCcw className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {renewalQuery.isLoading ? <Spinner /> : (renewalQuery.data ?? []).length}
          </p>
          <p className="mt-1 text-xs text-slate-400">Pacotes perto de expirar ou esgotar</p>
        </Card>

        <Card className="border-brand-100 bg-brand-50/60">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-brand-800">Dica para reduzir faltas</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-brand-600">
              <Lightbulb className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-brand-900">
            Envie lembretes de confirmação com 24h de antecedência. Clínicas que confirmam consultas por WhatsApp
            reduzem faltas em até 30%.
          </p>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Agenda de hoje</h2>
        <Card padded={false} className="divide-y divide-slate-100">
          {appointmentsQuery.isLoading ? (
            <div className="flex justify-center p-8">
              <Spinner />
            </div>
          ) : sortedToday.length === 0 ? (
            <p className="p-6 text-sm text-slate-400">Nenhum agendamento para hoje.</p>
          ) : (
            sortedToday.map((appointment) => (
              <div key={appointment.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="flex items-center gap-4">
                  <span className="w-14 text-sm font-medium text-slate-700">{formatTime(appointment.startsAt)}</span>
                  <span className="text-sm text-slate-600">
                    {appointment.patientName ?? `Paciente ${appointment.patientId.slice(0, 8)}`}
                  </span>
                </div>
                <AppointmentStatusBadge status={appointment.status} />
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}
