import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, addWeeks, format, startOfWeek, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bell, Plus } from 'lucide-react';
import {
  createAppointmentSeries,
  fetchAppointments,
  fetchPatientPackages,
  fetchPatients,
  fetchRooms,
  fetchUsers,
  sendAppointmentReminders,
  transitionAppointment,
} from '../lib/queries';
import { Button, Card, ErrorBanner, Field, Input, Modal, PageHeader, Select, Spinner } from '../components/ui';
import { AppointmentStatusBadge } from '../components/StatusBadge';
import { formatTime } from '../lib/format';
import { getApiErrorMessage } from '../lib/api';
import type { AbsenceKind, Appointment, AppointmentStatus } from '../lib/types';

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const ABSENCE_LABELS: Record<AbsenceKind, string> = {
  JUSTIFIED: 'Falta justificada',
  UNJUSTIFIED: 'Falta não justificada',
  CLINIC_CANCELLED: 'Cancelado pela clínica',
};

type NamedOption = { id: string; name: string };

export default function AgendaPage() {
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [professionalId, setProfessionalId] = useState('');
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [noShowTarget, setNoShowTarget] = useState<Appointment | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const weekEnd = addDays(weekStart, 6);

  const usersQuery = useQuery({ queryKey: ['users'], queryFn: fetchUsers });
  const patientsQuery = useQuery({ queryKey: ['patients'], queryFn: fetchPatients });
  const roomsQuery = useQuery({ queryKey: ['rooms'], queryFn: fetchRooms });

  const appointmentsQuery = useQuery({
    queryKey: ['appointments', weekStart.toISOString(), professionalId],
    queryFn: () =>
      fetchAppointments({
        from: weekStart.toISOString(),
        to: addDays(weekEnd, 1).toISOString(),
        professionalId: professionalId || undefined,
      }),
  });

  const professionals = useMemo(
    () => (usersQuery.data ?? []).filter((u) => u.role === 'PROFESSIONAL'),
    [usersQuery.data],
  );
  const patients = patientsQuery.data ?? [];
  const rooms = roomsQuery.data ?? [];

  const patientsById = useMemo(() => new Map(patients.map((p) => [p.id, p.name])), [patients]);
  const professionalsById = useMemo(() => new Map((usersQuery.data ?? []).map((u) => [u.id, u.name])), [usersQuery.data]);
  const roomsById = useMemo(() => new Map(rooms.map((r) => [r.id, r.name])), [rooms]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const day of days) map.set(format(day, 'yyyy-MM-dd'), []);
    for (const appointment of appointmentsQuery.data ?? []) {
      const key = format(new Date(appointment.startsAt), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(appointment);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    }
    return map;
  }, [appointmentsQuery.data, days]);

  const transitionMutation = useMutation({
    mutationFn: transitionAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setNoShowTarget(null);
    },
    onError: (err) => setFeedback(getApiErrorMessage(err, 'Não foi possível atualizar o agendamento.')),
  });

  const remindersMutation = useMutation({
    mutationFn: () => sendAppointmentReminders(24),
    onSuccess: (data) => {
      const count = typeof data === 'number' ? data : data?.sent ?? 0;
      setFeedback(`Lembretes enviados: ${count}`);
    },
    onError: (err) => setFeedback(getApiErrorMessage(err, 'Não foi possível enviar os lembretes.')),
  });

  function resolvePatientName(appointment: Appointment) {
    return appointment.patientName ?? patientsById.get(appointment.patientId) ?? 'Paciente';
  }

  function resolveProfessionalName(appointment: Appointment) {
    return appointment.professionalName ?? professionalsById.get(appointment.professionalId) ?? 'Profissional';
  }

  function handleStatusChange(appointment: Appointment, status: AppointmentStatus) {
    if (status === 'NO_SHOW') {
      setNoShowTarget(appointment);
      return;
    }
    transitionMutation.mutate({ id: appointment.id, status });
  }

  return (
    <div>
      <PageHeader
        title="Agenda"
        description="Visualize e gerencie os atendimentos da semana"
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => remindersMutation.mutate()} loading={remindersMutation.isPending}>
              <Bell className="h-4 w-4" />
              Enviar lembretes
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Nova série
            </Button>
          </div>
        }
      />

      {feedback && (
        <div className="mb-4">
          <ErrorBanner message={feedback} />
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setWeekStart((prev) => subWeeks(prev, 1))}>
            Semana anterior
          </Button>
          <span className="px-2 text-sm font-medium text-slate-700">
            {format(weekStart, "dd 'de' MMM", { locale: ptBR })} – {format(weekEnd, "dd 'de' MMM", { locale: ptBR })}
          </span>
          <Button variant="secondary" size="sm" onClick={() => setWeekStart((prev) => addWeeks(prev, 1))}>
            Próxima semana
          </Button>
        </div>

        <div className="w-56">
          <Select value={professionalId} onChange={(e) => setProfessionalId(e.target.value)}>
            <option value="">Todos os profissionais</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {appointmentsQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-5">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayAppointments = appointmentsByDay.get(key) ?? [];
            return (
              <Card key={key} padded={false}>
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                  <p className="text-sm font-semibold capitalize text-slate-800">
                    {format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </p>
                  <span className="text-xs text-slate-400">{dayAppointments.length} atendimento(s)</span>
                </div>
                {dayAppointments.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-slate-400">Sem agendamentos.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {dayAppointments.map((appointment) => (
                      <div key={appointment.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                        <div className="flex items-center gap-4">
                          <span className="w-16 text-sm font-medium text-slate-700">{formatTime(appointment.startsAt)}</span>
                          <div>
                            <p className="text-sm font-medium text-slate-800">{resolvePatientName(appointment)}</p>
                            <p className="text-xs text-slate-400">
                              {resolveProfessionalName(appointment)}
                              {appointment.roomId ? ` · ${roomsById.get(appointment.roomId) ?? 'Sala'}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <AppointmentStatusBadge status={appointment.status} />
                          {(appointment.status === 'SCHEDULED' || appointment.status === 'CONFIRMED') && (
                            <div className="flex gap-1.5">
                              {appointment.status === 'SCHEDULED' && (
                                <Button size="sm" variant="secondary" onClick={() => handleStatusChange(appointment, 'CONFIRMED')}>
                                  Confirmar
                                </Button>
                              )}
                              <Button size="sm" variant="secondary" onClick={() => handleStatusChange(appointment, 'COMPLETED')}>
                                Concluir
                              </Button>
                              <Button size="sm" variant="danger" onClick={() => handleStatusChange(appointment, 'NO_SHOW')}>
                                Falta
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {isCreateOpen && (
        <CreateSeriesModal
          patients={patients}
          professionals={professionals}
          rooms={rooms}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
          }}
        />
      )}

      {noShowTarget && (
        <NoShowModal
          appointment={noShowTarget}
          onClose={() => setNoShowTarget(null)}
          onConfirm={(payload) => transitionMutation.mutate(payload)}
          loading={transitionMutation.isPending}
        />
      )}
    </div>
  );
}

function CreateSeriesModal({
  patients,
  professionals,
  rooms,
  onClose,
  onCreated,
}: {
  patients: NamedOption[];
  professionals: NamedOption[];
  rooms: NamedOption[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [patientId, setPatientId] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('08:00');
  const [durationMinutes, setDurationMinutes] = useState(40);
  const [firstDate, setFirstDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [occurrences, setOccurrences] = useState(4);
  const [packageId, setPackageId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const packagesQuery = useQuery({
    queryKey: ['patient-packages', patientId],
    queryFn: () => fetchPatientPackages(patientId),
    enabled: Boolean(patientId),
  });

  const createMutation = useMutation({
    mutationFn: createAppointmentSeries,
    onSuccess: onCreated,
    onError: (err) => setError(getApiErrorMessage(err, 'Não foi possível criar a série de agendamentos.')),
  });

  function toggleWeekday(day: number) {
    setWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)));
  }

  function handleSubmit() {
    setError(null);
    if (!patientId || !professionalId || weekdays.length === 0) {
      setError('Selecione paciente, profissional e ao menos um dia da semana.');
      return;
    }
    createMutation.mutate({
      patientId,
      professionalId,
      roomId: roomId || undefined,
      packageId: packageId || undefined,
      weekdays,
      startTime,
      durationMinutes,
      firstDate,
      occurrences,
    });
  }

  const activePackages = (packagesQuery.data ?? []).filter((pkg) => pkg.status === 'ACTIVE');

  return (
    <Modal title="Nova série de agendamentos" onClose={onClose}>
      <div className="space-y-4">
        {error && <ErrorBanner message={error} />}

        <Field label="Paciente">
          <Select
            value={patientId}
            onChange={(e) => {
              setPatientId(e.target.value);
              setPackageId('');
            }}
          >
            <option value="">Selecione um paciente</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Profissional">
          <Select value={professionalId} onChange={(e) => setProfessionalId(e.target.value)}>
            <option value="">Selecione um profissional</option>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Sala (opcional)">
          <Select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
            <option value="">Sem sala definida</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Pacote (opcional)" hint={patientId ? undefined : 'Selecione um paciente para listar pacotes ativos'}>
          <Select value={packageId} onChange={(e) => setPackageId(e.target.value)} disabled={!patientId}>
            <option value="">Sem débito de pacote</option>
            {activePackages.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                Pacote {pkg.id.slice(0, 8)} · {pkg.totalSessions - pkg.usedSessions} sessões restantes
              </option>
            ))}
          </Select>
        </Field>

        <div>
          <p className="mb-1.5 text-xs font-medium text-slate-600">Dias da semana</p>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_LABELS.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => toggleWeekday(index)}
                className={
                  weekdays.includes(index)
                    ? 'rounded-lg border border-brand-600 bg-brand-600 px-3 py-1.5 text-xs font-medium text-white'
                    : 'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50'
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Horário de início">
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </Field>
          <Field label="Duração (min)">
            <Input
              type="number"
              min={10}
              step={5}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Data da primeira sessão">
            <Input type="date" value={firstDate} onChange={(e) => setFirstDate(e.target.value)} />
          </Field>
          <Field label="Número de ocorrências">
            <Input type="number" min={1} max={52} value={occurrences} onChange={(e) => setOccurrences(Number(e.target.value))} />
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={createMutation.isPending}>
            Criar série
          </Button>
        </div>
      </div>
    </Modal>
  );
}

type NoShowPayload = {
  id: string;
  status: AppointmentStatus;
  absenceKind?: AbsenceKind;
  absenceNotes?: string;
  scheduleMakeupAt?: string;
};

function NoShowModal({
  appointment,
  onClose,
  onConfirm,
  loading,
}: {
  appointment: Appointment;
  onClose: () => void;
  onConfirm: (payload: NoShowPayload) => void;
  loading: boolean;
}) {
  const [absenceKind, setAbsenceKind] = useState<AbsenceKind>('UNJUSTIFIED');
  const [absenceNotes, setAbsenceNotes] = useState('');
  const [scheduleMakeup, setScheduleMakeup] = useState(false);
  const [makeupAt, setMakeupAt] = useState('');

  function handleConfirm() {
    onConfirm({
      id: appointment.id,
      status: 'NO_SHOW',
      absenceKind,
      absenceNotes: absenceNotes || undefined,
      scheduleMakeupAt: scheduleMakeup && makeupAt ? new Date(makeupAt).toISOString() : undefined,
    });
  }

  return (
    <Modal title="Registrar falta" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Tipo de falta">
          <Select value={absenceKind} onChange={(e) => setAbsenceKind(e.target.value as AbsenceKind)}>
            {Object.entries(ABSENCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Observações (opcional)">
          <Input
            value={absenceNotes}
            onChange={(e) => setAbsenceNotes(e.target.value)}
            placeholder="Ex: paciente avisou com antecedência"
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={scheduleMakeup}
            onChange={(e) => setScheduleMakeup(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          Agendar reposição
        </label>

        {scheduleMakeup && (
          <Field label="Data e horário da reposição">
            <Input type="datetime-local" value={makeupAt} onChange={(e) => setMakeupAt(e.target.value)} />
          </Field>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirm} loading={loading}>
            Registrar falta
          </Button>
        </div>
      </div>
    </Modal>
  );
}
