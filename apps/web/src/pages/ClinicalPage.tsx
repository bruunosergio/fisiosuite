import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, subDays } from 'date-fns';
import clsx from 'clsx';
import {
  createClinicalRecord,
  createSessionNote,
  fetchAppointments,
  fetchClinicalRecords,
  fetchPatients,
  fetchSessionNotes,
  fetchUsers,
} from '../lib/queries';
import { Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, Select, Spinner, Textarea } from '../components/ui';
import { AppointmentStatusBadge } from '../components/StatusBadge';
import { formatDateTime } from '../lib/format';
import { getApiErrorMessage } from '../lib/api';
import type { AppointmentStatus, ClinicalRecord, SessionNoteHistoryItem } from '../lib/types';

type HistoryTab = 'all' | 'evaluations' | 'evolutions';

type RecordFormState = {
  chiefComplaint: string;
  anamnesis: string;
  painScale: string;
  assessment: string;
  plan: string;
};

type NoteFormState = {
  appointmentId: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  markCompleted: boolean;
};

type TimelineItem =
  | { kind: 'evaluation'; at: number; record: ClinicalRecord }
  | { kind: 'evolution'; at: number; note: SessionNoteHistoryItem };

export default function ClinicalPage() {
  const queryClient = useQueryClient();
  const [patientId, setPatientId] = useState('');
  const [professionalId, setProfessionalId] = useState('');
  const [historyTab, setHistoryTab] = useState<HistoryTab>('all');
  const [recordError, setRecordError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);

  const [recordForm, setRecordForm] = useState<RecordFormState>({
    chiefComplaint: '',
    anamnesis: '',
    painScale: '',
    assessment: '',
    plan: '',
  });
  const [noteForm, setNoteForm] = useState<NoteFormState>({
    appointmentId: '',
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    markCompleted: true,
  });

  const patientsQuery = useQuery({ queryKey: ['patients'], queryFn: fetchPatients });
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: fetchUsers });

  const recordsQuery = useQuery({
    queryKey: ['clinical', 'records', patientId],
    queryFn: () => fetchClinicalRecords(patientId),
    enabled: Boolean(patientId),
  });

  const notesQuery = useQuery({
    queryKey: ['clinical', 'session-notes', patientId],
    queryFn: () => fetchSessionNotes(patientId),
    enabled: Boolean(patientId),
  });

  const appointmentsQuery = useQuery({
    queryKey: ['clinical', 'appointments', patientId],
    queryFn: () =>
      fetchAppointments({
        from: subDays(new Date(), 60).toISOString(),
        to: addDays(new Date(), 60).toISOString(),
        patientId,
      }),
    enabled: Boolean(patientId),
  });

  const professionals = useMemo(
    () => (usersQuery.data ?? []).filter((u) => u.role === 'PROFESSIONAL' && u.active),
    [usersQuery.data],
  );

  const professionalsById = useMemo(
    () => new Map((usersQuery.data ?? []).map((u) => [u.id, u.name])),
    [usersQuery.data],
  );

  const timeline = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];
    for (const record of recordsQuery.data ?? []) {
      items.push({ kind: 'evaluation', at: new Date(record.createdAt).getTime(), record });
    }
    for (const note of notesQuery.data ?? []) {
      items.push({
        kind: 'evolution',
        at: new Date(note.appointmentStartsAt).getTime(),
        note,
      });
    }
    return items.sort((a, b) => b.at - a.at);
  }, [recordsQuery.data, notesQuery.data]);

  const filteredTimeline = useMemo(() => {
    if (historyTab === 'evaluations') return timeline.filter((i) => i.kind === 'evaluation');
    if (historyTab === 'evolutions') return timeline.filter((i) => i.kind === 'evolution');
    return timeline;
  }, [timeline, historyTab]);

  const createRecordMutation = useMutation({
    mutationFn: createClinicalRecord,
    onSuccess: () => {
      setRecordForm({ chiefComplaint: '', anamnesis: '', painScale: '', assessment: '', plan: '' });
      queryClient.invalidateQueries({ queryKey: ['clinical', 'records', patientId] });
    },
    onError: (err) => setRecordError(getApiErrorMessage(err, 'Não foi possível salvar a avaliação.')),
  });

  const createNoteMutation = useMutation({
    mutationFn: createSessionNote,
    onSuccess: () => {
      setNoteForm({ appointmentId: '', subjective: '', objective: '', assessment: '', plan: '', markCompleted: true });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['clinical', 'appointments', patientId] });
      queryClient.invalidateQueries({ queryKey: ['clinical', 'session-notes', patientId] });
    },
    onError: (err) => setNoteError(getApiErrorMessage(err, 'Não foi possível salvar a evolução.')),
  });

  function handleCreateRecord() {
    setRecordError(null);
    if (!patientId || !professionalId || !recordForm.chiefComplaint.trim()) {
      setRecordError('Selecione paciente, profissional e informe a queixa principal.');
      return;
    }
    createRecordMutation.mutate({
      patientId,
      professionalId,
      chiefComplaint: recordForm.chiefComplaint,
      anamnesis: recordForm.anamnesis || undefined,
      painScale: recordForm.painScale ? Number(recordForm.painScale) : undefined,
      assessment: recordForm.assessment || undefined,
      plan: recordForm.plan || undefined,
    });
  }

  function handleCreateNote() {
    setNoteError(null);
    if (!noteForm.appointmentId || !professionalId) {
      setNoteError('Selecione o agendamento e o profissional responsável.');
      return;
    }
    createNoteMutation.mutate({
      appointmentId: noteForm.appointmentId,
      professionalId,
      subjective: noteForm.subjective || undefined,
      objective: noteForm.objective || undefined,
      assessment: noteForm.assessment || undefined,
      plan: noteForm.plan || undefined,
      markCompleted: noteForm.markCompleted,
    });
  }

  const historyLoading = recordsQuery.isLoading || notesQuery.isLoading;
  const evaluationCount = recordsQuery.data?.length ?? 0;
  const evolutionCount = notesQuery.data?.length ?? 0;

  return (
    <div>
      <PageHeader title="Prontuário" description="Avaliações, evoluções SOAP e linha do tempo clínica do paciente" />

      <Card className="mb-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Paciente">
            <Select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">Selecione um paciente</option>
              {(patientsQuery.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Profissional responsável">
            <Select value={professionalId} onChange={(e) => setProfessionalId(e.target.value)}>
              <option value="">Selecione um profissional</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      {!patientId ? (
        <EmptyState title="Selecione um paciente" description="Escolha um paciente para ver e registrar informações clínicas." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <h2 className="mb-4 text-sm font-semibold text-slate-700">Nova avaliação</h2>
              {recordError && (
                <div className="mb-3">
                  <ErrorBanner message={recordError} />
                </div>
              )}
              <div className="space-y-3">
                <Field label="Queixa principal">
                  <Input
                    value={recordForm.chiefComplaint}
                    onChange={(e) => setRecordForm((p) => ({ ...p, chiefComplaint: e.target.value }))}
                    placeholder="Dor lombar há 3 semanas"
                  />
                </Field>
                <Field label="Anamnese">
                  <Textarea
                    rows={3}
                    value={recordForm.anamnesis}
                    onChange={(e) => setRecordForm((p) => ({ ...p, anamnesis: e.target.value }))}
                  />
                </Field>
                <Field label="Escala de dor (0-10)">
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    value={recordForm.painScale}
                    onChange={(e) => setRecordForm((p) => ({ ...p, painScale: e.target.value }))}
                  />
                </Field>
                <Field label="Avaliação">
                  <Textarea
                    rows={2}
                    value={recordForm.assessment}
                    onChange={(e) => setRecordForm((p) => ({ ...p, assessment: e.target.value }))}
                  />
                </Field>
                <Field label="Plano de tratamento">
                  <Textarea rows={2} value={recordForm.plan} onChange={(e) => setRecordForm((p) => ({ ...p, plan: e.target.value }))} />
                </Field>
                <div className="flex justify-end">
                  <Button onClick={handleCreateRecord} loading={createRecordMutation.isPending}>
                    Salvar avaliação
                  </Button>
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="mb-4 text-sm font-semibold text-slate-700">Evolução por sessão</h2>
              {noteError && (
                <div className="mb-3">
                  <ErrorBanner message={noteError} />
                </div>
              )}
              <div className="space-y-3">
                <Field label="Agendamento">
                  <Select
                    value={noteForm.appointmentId}
                    onChange={(e) => setNoteForm((p) => ({ ...p, appointmentId: e.target.value }))}
                  >
                    <option value="">Selecione um agendamento</option>
                    {(appointmentsQuery.data ?? []).map((a) => (
                      <option key={a.id} value={a.id}>
                        {formatDateTime(a.startsAt)} · {a.status}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Subjetivo (S)">
                  <Textarea
                    rows={2}
                    value={noteForm.subjective}
                    onChange={(e) => setNoteForm((p) => ({ ...p, subjective: e.target.value }))}
                  />
                </Field>
                <Field label="Objetivo (O)">
                  <Textarea
                    rows={2}
                    value={noteForm.objective}
                    onChange={(e) => setNoteForm((p) => ({ ...p, objective: e.target.value }))}
                  />
                </Field>
                <Field label="Avaliação (A)">
                  <Textarea
                    rows={2}
                    value={noteForm.assessment}
                    onChange={(e) => setNoteForm((p) => ({ ...p, assessment: e.target.value }))}
                  />
                </Field>
                <Field label="Plano (P)">
                  <Textarea rows={2} value={noteForm.plan} onChange={(e) => setNoteForm((p) => ({ ...p, plan: e.target.value }))} />
                </Field>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={noteForm.markCompleted}
                    onChange={(e) => setNoteForm((p) => ({ ...p, markCompleted: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  Marcar sessão como concluída
                </label>
                <div className="flex justify-end">
                  <Button onClick={handleCreateNote} loading={createNoteMutation.isPending}>
                    Salvar evolução
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-700">Histórico clínico</h2>
              <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
                {(
                  [
                    ['all', `Tudo (${evaluationCount + evolutionCount})`],
                    ['evaluations', `Avaliações (${evaluationCount})`],
                    ['evolutions', `Evoluções (${evolutionCount})`],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setHistoryTab(value)}
                    className={clsx(
                      'rounded-md px-2.5 py-1.5 font-medium transition-colors',
                      historyTab === value ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-50',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {historyLoading ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : filteredTimeline.length === 0 ? (
              <EmptyState
                title={
                  historyTab === 'evolutions'
                    ? 'Nenhuma evolução registrada'
                    : historyTab === 'evaluations'
                      ? 'Nenhuma avaliação registrada'
                      : 'Nenhum registro clínico'
                }
                description="Avaliações iniciais e evoluções SOAP das sessões aparecerão aqui."
              />
            ) : (
              <div className="space-y-4">
                {filteredTimeline.map((item) =>
                  item.kind === 'evaluation' ? (
                    <Card key={`eval-${item.record.id}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="mb-1 inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-800">
                            Avaliação
                          </span>
                          <p className="text-sm font-semibold text-slate-800">{item.record.chiefComplaint}</p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {professionalsById.get(item.record.professionalId) ?? 'Profissional'}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-slate-400">{formatDateTime(item.record.createdAt)}</span>
                      </div>
                      {item.record.anamnesis && <p className="mt-2 text-sm text-slate-600">{item.record.anamnesis}</p>}
                      <div className="mt-3 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
                        {item.record.painScale !== null && <p>Escala de dor: {item.record.painScale}/10</p>}
                        {item.record.assessment && <p>Avaliação: {item.record.assessment}</p>}
                        {item.record.plan && <p className="sm:col-span-2">Plano: {item.record.plan}</p>}
                      </div>
                    </Card>
                  ) : (
                    <Card key={`note-${item.note.id}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="mb-1 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                            Evolução SOAP
                          </span>
                          <p className="text-sm font-semibold text-slate-800">
                            Sessão · {formatDateTime(item.note.appointmentStartsAt)}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {professionalsById.get(item.note.professionalId) ?? 'Profissional'}
                          </p>
                        </div>
                        <AppointmentStatusBadge status={item.note.appointmentStatus as AppointmentStatus} />
                      </div>
                      <div className="mt-3 space-y-2 text-sm text-slate-600">
                        {item.note.subjective && (
                          <p>
                            <span className="font-medium text-slate-700">S:</span> {item.note.subjective}
                          </p>
                        )}
                        {item.note.objective && (
                          <p>
                            <span className="font-medium text-slate-700">O:</span> {item.note.objective}
                          </p>
                        )}
                        {item.note.assessment && (
                          <p>
                            <span className="font-medium text-slate-700">A:</span> {item.note.assessment}
                          </p>
                        )}
                        {item.note.plan && (
                          <p>
                            <span className="font-medium text-slate-700">P:</span> {item.note.plan}
                          </p>
                        )}
                        {!item.note.subjective &&
                          !item.note.objective &&
                          !item.note.assessment &&
                          !item.note.plan && (
                            <p className="text-xs text-slate-400">Evolução sem conteúdo SOAP preenchido.</p>
                          )}
                      </div>
                    </Card>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
