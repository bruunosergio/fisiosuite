import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Hospital, Plus, UserRound } from 'lucide-react';
import {
  admitPatient,
  closeShiftHandoff,
  createBed,
  createHospital,
  createPlantaoEncounter,
  createWard,
  dischargeAdmission,
  fetchAdmissionEncounters,
  fetchAdmissions,
  fetchFreeBeds,
  fetchHospitals,
  fetchOpenShift,
  fetchPatients,
  fetchUsers,
  openShift,
  transferAdmission,
  updateCensusItem,
} from '../lib/queries';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  Textarea,
} from '../components/ui';
import { getApiErrorMessage } from '../lib/api';
import type {
  AdmissionDetail,
  CensusItemDetail,
  CensusItemStatus,
  CensusPriority,
  DischargeDestination,
  Precautions,
  ShiftDetail,
} from '../lib/types';

type Tab = 'censo' | 'admitir' | 'cadastros';

const PRIORITY_LABEL: Record<CensusPriority, string> = {
  CRITICAL: 'Crítico',
  WATCH: 'Acompanhar',
  STABLE: 'Estável',
};

const STATUS_LABEL: Record<CensusItemStatus, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em atendimento',
  DONE: 'Atendido',
  CONTRAINDICATED: 'Contraindicado',
  DISCHARGED_TODAY: 'Alta no turno',
};

const CONDUCT_TAGS = [
  { id: 'mobilizacao', label: 'Mobilização' },
  { id: 'higiene_bronquica', label: 'Higiene brônquica' },
  { id: 'exercicios', label: 'Exercícios' },
  { id: 'orientacao', label: 'Orientação' },
  { id: 'avaliacao', label: 'Avaliação' },
];

const PRECAUTION_FIELDS: Array<{ key: keyof Precautions; label: string }> = [
  { key: 'isolation', label: 'Isolamento' },
  { key: 'oxygen', label: 'O2' },
  { key: 'mechanicalVentilation', label: 'VM' },
  { key: 'niv', label: 'VNI' },
  { key: 'tracheostomy', label: 'Traqueo' },
  { key: 'drain', label: 'Dreno' },
  { key: 'orthosis', label: 'Ortótese' },
  { key: 'mobilityRestriction', label: 'Restrição mobilidade' },
  { key: 'fallRisk', label: 'Risco de queda' },
];

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PlantaoPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('censo');
  const [hospitalId, setHospitalId] = useState('');
  const [wardFilter, setWardFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | CensusItemStatus>('all');
  const [selected, setSelected] = useState<CensusItemDetail | null>(null);
  const [encounterOpen, setEncounterOpen] = useState(false);
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [admitOpen, setAdmitOpen] = useState(false);
  const [dischargeTarget, setDischargeTarget] = useState<AdmissionDetail | null>(null);
  const [transferTarget, setTransferTarget] = useState<AdmissionDetail | null>(null);

  const hospitalsQuery = useQuery({ queryKey: ['plantao', 'hospitals'], queryFn: fetchHospitals });
  const hospitals = hospitalsQuery.data ?? [];
  const selectedHospitalId = hospitalId || hospitals[0]?.id || '';

  const openShiftQuery = useQuery({
    queryKey: ['plantao', 'open-shift', selectedHospitalId],
    queryFn: () => fetchOpenShift(selectedHospitalId || undefined),
    enabled: Boolean(selectedHospitalId),
  });

  const admissionsQuery = useQuery({
    queryKey: ['plantao', 'admissions', selectedHospitalId],
    queryFn: () => fetchAdmissions({ hospitalSiteId: selectedHospitalId, status: 'ACTIVE' }),
    enabled: Boolean(selectedHospitalId),
  });

  const patientsQuery = useQuery({ queryKey: ['patients'], queryFn: fetchPatients });
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: fetchUsers });

  const shift = openShiftQuery.data;
  const census = useMemo(() => {
    let items = shift?.census ?? [];
    if (wardFilter !== 'all') items = items.filter((c) => c.admission.wardId === wardFilter);
    if (statusFilter !== 'all') items = items.filter((c) => c.status === statusFilter);
    return items;
  }, [shift, wardFilter, statusFilter]);

  function invalidatePlantao() {
    qc.invalidateQueries({ queryKey: ['plantao'] });
  }

  const selectedHospital = hospitals.find((h) => h.id === selectedHospitalId);

  return (
    <div>
      <PageHeader
        title="Plantão"
        description="Censo, internações e evoluções à beira-leito (registro operacional da equipe)"
        action={
          shift ? (
            <Button variant="secondary" onClick={() => setHandoffOpen(true)}>
              Passar plantão
            </Button>
          ) : null
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Hospital">
          <Select
            value={selectedHospitalId}
            onChange={(e) => {
              setHospitalId(e.target.value);
              setWardFilter('all');
            }}
          >
            {hospitals.length === 0 && <option value="">Cadastre um hospital</option>}
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
                {h.city ? ` — ${h.city}` : ''}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex gap-2">
          {(
            [
              ['censo', 'Censo'],
              ['admitir', 'Internações'],
              ['cadastros', 'Cadastros'],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              variant={tab === id ? 'primary' : 'secondary'}
              onClick={() => setTab(id)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {hospitalsQuery.isError && (
        <div className="mb-4">
          <ErrorBanner message={getApiErrorMessage(hospitalsQuery.error)} />
        </div>
      )}

      {tab === 'censo' && (
        <CensoPanel
          shift={shift}
          loading={openShiftQuery.isLoading}
          census={census}
          hospital={selectedHospital}
          wardFilter={wardFilter}
          setWardFilter={setWardFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          hospitalId={selectedHospitalId}
          onOpened={invalidatePlantao}
          onSelect={(item) => {
            setSelected(item);
            setEncounterOpen(true);
          }}
          onUpdateStatus={async (id, status) => {
            await updateCensusItem(id, { status });
            invalidatePlantao();
          }}
          onUpdatePriority={async (id, priority) => {
            await updateCensusItem(id, { priority });
            invalidatePlantao();
          }}
        />
      )}

      {tab === 'admitir' && (
        <AdmissionsPanel
          admissions={admissionsQuery.data ?? []}
          loading={admissionsQuery.isLoading}
          onAdmit={() => setAdmitOpen(true)}
          onDischarge={setDischargeTarget}
          onTransfer={setTransferTarget}
          onRefresh={invalidatePlantao}
        />
      )}

      {tab === 'cadastros' && (
        <SetupPanel hospitals={hospitals} onChanged={invalidatePlantao} />
      )}

      {encounterOpen && selected && shift && (
        <EncounterModal
          item={selected}
          shiftId={shift.id}
          onClose={() => {
            setEncounterOpen(false);
            setSelected(null);
          }}
          onSaved={() => {
            invalidatePlantao();
            setEncounterOpen(false);
            setSelected(null);
          }}
        />
      )}

      {handoffOpen && shift && (
        <HandoffModal
          shiftId={shift.id}
          users={usersQuery.data ?? []}
          onClose={() => setHandoffOpen(false)}
          onDone={() => {
            invalidatePlantao();
            setHandoffOpen(false);
          }}
        />
      )}

      {admitOpen && selectedHospitalId && (
        <AdmitModal
          hospitalId={selectedHospitalId}
          hospital={selectedHospital}
          patients={patientsQuery.data ?? []}
          onClose={() => setAdmitOpen(false)}
          onSaved={() => {
            invalidatePlantao();
            setAdmitOpen(false);
          }}
        />
      )}

      {dischargeTarget && (
        <DischargeModal
          admission={dischargeTarget}
          onClose={() => setDischargeTarget(null)}
          onSaved={() => {
            invalidatePlantao();
            setDischargeTarget(null);
          }}
        />
      )}

      {transferTarget && (
        <TransferModal
          admission={transferTarget}
          onClose={() => setTransferTarget(null)}
          onSaved={() => {
            invalidatePlantao();
            setTransferTarget(null);
          }}
        />
      )}
    </div>
  );
}

function CensoPanel({
  shift,
  loading,
  census,
  hospital,
  wardFilter,
  setWardFilter,
  statusFilter,
  setStatusFilter,
  hospitalId,
  onOpened,
  onSelect,
  onUpdateStatus,
  onUpdatePriority,
}: {
  shift: ShiftDetail | null | undefined;
  loading: boolean;
  census: CensusItemDetail[];
  hospital?: { id: string; name: string; wards: Array<{ id: string; name: string }> };
  wardFilter: string;
  setWardFilter: (v: string) => void;
  statusFilter: 'all' | CensusItemStatus;
  setStatusFilter: (v: 'all' | CensusItemStatus) => void;
  hospitalId: string;
  onOpened: () => void;
  onSelect: (item: CensusItemDetail) => void;
  onUpdateStatus: (id: string, status: CensusItemStatus) => Promise<void>;
  onUpdatePriority: (id: string, priority: CensusPriority) => Promise<void>;
}) {
  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <Spinner />
      </div>
    );
  }

  if (!shift) {
    return <OpenShiftForm hospitalId={hospitalId} hospital={hospital} onOpened={onOpened} />;
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Plantão aberto — {shift.hospitalName}
            </p>
            <p className="text-xs text-slate-500">
              {new Date(shift.startsAt).toLocaleString('pt-BR')} →{' '}
              {new Date(shift.endsAt).toLocaleString('pt-BR')} · {census.length} no filtro
            </p>
          </div>
          <Badge>{shift.status}</Badge>
        </div>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Select value={wardFilter} onChange={(e) => setWardFilter(e.target.value)} className="sm:w-48">
          <option value="all">Todos os setores</option>
          {(hospital?.wards ?? []).map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </Select>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | CensusItemStatus)}
          className="sm:w-48"
        >
          <option value="all">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </div>

      <Card padded={false}>
        {census.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Censo vazio"
              description="Admita pacientes ou ajuste os filtros do plantão."
            />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {census.map((item) => (
              <li key={item.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900">{item.admission.patientName}</p>
                    <Badge>
                      {item.admission.wardName} · Leito {item.admission.bedCode}
                    </Badge>
                    {item.admission.openPending && <Badge tone="amber">Pendência</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.admission.diagnosis || item.admission.reason || 'Sem diagnóstico informado'}
                    {item.admission.openPending ? ` · ${item.admission.openPending}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={item.priority}
                    onChange={(e) => onUpdatePriority(item.id, e.target.value as CensusPriority)}
                    className="w-36"
                  >
                    {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                  <Select
                    value={item.status}
                    onChange={(e) => onUpdateStatus(item.id, e.target.value as CensusItemStatus)}
                    className="w-40"
                  >
                    {Object.entries(STATUS_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </Select>
                  <Button onClick={() => onSelect(item)}>
                    <ClipboardList className="h-4 w-4" />
                    Evoluir
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function OpenShiftForm({
  hospitalId,
  hospital,
  onOpened,
}: {
  hospitalId: string;
  hospital?: { wards: Array<{ id: string; name: string }> };
  onOpened: () => void;
}) {
  const now = new Date();
  const end = new Date(now.getTime() + 12 * 60 * 60 * 1000);
  const [startsAt, setStartsAt] = useState(toLocalInput(now));
  const [endsAt, setEndsAt] = useState(toLocalInput(end));
  const [wardIds, setWardIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      openShift({
        hospitalSiteId: hospitalId,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        wardIds: wardIds.length ? wardIds : undefined,
      }),
    onSuccess: () => onOpened(),
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  if (!hospitalId) {
    return (
      <EmptyState
        title="Cadastre um hospital"
        description="Vá em Cadastros para criar hospital, setores e leitos."
      />
    );
  }

  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <Hospital className="h-5 w-5 text-brand-600" />
        <div>
          <p className="font-semibold text-slate-900">Abrir plantão</p>
          <p className="text-sm text-slate-500">
            O censo será montado com as internações ativas dos setores cobertos.
          </p>
        </div>
      </div>
      {error && (
        <div className="mb-3">
          <ErrorBanner message={error} />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Início">
          <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </Field>
        <Field label="Fim">
          <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </Field>
      </div>
      <div className="mt-4">
        <p className="mb-2 text-sm font-medium text-slate-700">Setores (vazio = todos)</p>
        <div className="flex flex-wrap gap-2">
          {(hospital?.wards ?? []).map((w) => {
            const on = wardIds.includes(w.id);
            return (
              <button
                key={w.id}
                type="button"
                onClick={() =>
                  setWardIds((prev) => (on ? prev.filter((id) => id !== w.id) : [...prev, w.id]))
                }
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  on ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'
                }`}
              >
                {w.name}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-6">
        <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? 'Abrindo…' : 'Abrir plantão'}
        </Button>
      </div>
    </Card>
  );
}

function AdmissionsPanel({
  admissions,
  loading,
  onAdmit,
  onDischarge,
  onTransfer,
}: {
  admissions: AdmissionDetail[];
  loading: boolean;
  onAdmit: () => void;
  onDischarge: (a: AdmissionDetail) => void;
  onTransfer: (a: AdmissionDetail) => void;
  onRefresh: () => void;
}) {
  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={onAdmit}>
          <Plus className="h-4 w-4" />
          Nova internação
        </Button>
      </div>
      <Card padded={false}>
        {admissions.length === 0 ? (
          <div className="p-6">
            <EmptyState title="Nenhuma internação ativa" description="Admita o primeiro paciente." />
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">Paciente</th>
                <th className="px-5 py-3 font-medium">Local</th>
                <th className="px-5 py-3 font-medium">Diagnóstico</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {admissions.map((a) => (
                <tr key={a.id} className="border-b border-slate-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900">{a.patientName}</p>
                    <p className="text-xs text-slate-400">{a.hospitalMrn || 'Sem prontuário'}</p>
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {a.wardName} · {a.bedCode}
                  </td>
                  <td className="px-5 py-3 text-slate-600">{a.diagnosis || a.reason || '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" onClick={() => onTransfer(a)}>
                        Transferir
                      </Button>
                      <Button variant="secondary" onClick={() => onDischarge(a)}>
                        Alta
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function SetupPanel({
  hospitals,
  onChanged,
}: {
  hospitals: Awaited<ReturnType<typeof fetchHospitals>>;
  onChanged: () => void;
}) {
  const [hospitalName, setHospitalName] = useState('');
  const [city, setCity] = useState('');
  const [wardHospitalId, setWardHospitalId] = useState('');
  const [wardName, setWardName] = useState('');
  const [bedWardId, setBedWardId] = useState('');
  const [bedCode, setBedCode] = useState('');
  const [error, setError] = useState('');

  const wards = hospitals.flatMap((h) => h.wards.map((w) => ({ ...w, hospitalName: h.name })));

  async function run(fn: () => Promise<unknown>) {
    setError('');
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} />}
      <Card>
        <p className="mb-3 font-semibold text-slate-900">Hospital</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Nome">
            <Input value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} />
          </Field>
          <Field label="Cidade">
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </Field>
          <div className="flex items-end">
            <Button
              onClick={() =>
                run(async () => {
                  await createHospital({ name: hospitalName, city: city || undefined });
                  setHospitalName('');
                  setCity('');
                })
              }
            >
              Criar hospital
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <p className="mb-3 font-semibold text-slate-900">Setor</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Hospital">
            <Select value={wardHospitalId} onChange={(e) => setWardHospitalId(e.target.value)}>
              <option value="">Selecione</option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nome do setor">
            <Input value={wardName} onChange={(e) => setWardName(e.target.value)} placeholder="UTI, Enfermaria…" />
          </Field>
          <div className="flex items-end">
            <Button
              onClick={() =>
                run(async () => {
                  await createWard({ hospitalSiteId: wardHospitalId, name: wardName });
                  setWardName('');
                })
              }
            >
              Criar setor
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <p className="mb-3 font-semibold text-slate-900">Leito</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Setor">
            <Select value={bedWardId} onChange={(e) => setBedWardId(e.target.value)}>
              <option value="">Selecione</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.hospitalName} · {w.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Código">
            <Input value={bedCode} onChange={(e) => setBedCode(e.target.value)} placeholder="101-A" />
          </Field>
          <div className="flex items-end">
            <Button
              onClick={() =>
                run(async () => {
                  await createBed({ wardId: bedWardId, code: bedCode });
                  setBedCode('');
                })
              }
            >
              Criar leito
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <p className="mb-3 font-semibold text-slate-900">Estrutura atual</p>
        {hospitals.length === 0 ? (
          <EmptyState title="Nenhum hospital" description="Crie o primeiro local de cobertura." />
        ) : (
          <ul className="space-y-3 text-sm">
            {hospitals.map((h) => (
              <li key={h.id}>
                <p className="font-medium text-slate-900">{h.name}</p>
                <ul className="mt-1 space-y-1 pl-3 text-slate-600">
                  {h.wards.map((w) => (
                    <li key={w.id}>
                      {w.name} — {w.beds.length} leito(s):{' '}
                      {w.beds.map((b) => `${b.code}(${b.status})`).join(', ') || 'nenhum'}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function EncounterModal({
  item,
  shiftId,
  onClose,
  onSaved,
}: {
  item: CensusItemDetail;
  shiftId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [conduct, setConduct] = useState('');
  const [response, setResponse] = useState('');
  const [intercurrence, setIntercurrence] = useState('');
  const [pendingForNext, setPendingForNext] = useState(item.admission.openPending ?? '');
  const [painScale, setPainScale] = useState('');
  const [dyspneaScale, setDyspneaScale] = useState('');
  const [mobilityAssist, setMobilityAssist] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState('');

  const encountersQuery = useQuery({
    queryKey: ['plantao', 'encounters', item.admissionId],
    queryFn: () => fetchAdmissionEncounters(item.admissionId),
  });

  const mutation = useMutation({
    mutationFn: () =>
      createPlantaoEncounter({
        shiftId,
        admissionId: item.admissionId,
        conduct,
        tags,
        response: response || undefined,
        intercurrence: intercurrence || undefined,
        pendingForNext: pendingForNext || undefined,
        painScale: painScale ? Number(painScale) : undefined,
        dyspneaScale: dyspneaScale ? Number(dyspneaScale) : undefined,
        mobilityAssist: mobilityAssist || undefined,
      }),
    onSuccess: onSaved,
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  return (
    <Modal
      title={`Evolução — ${item.admission.patientName}`}
      onClose={onClose}
      widthClassName="max-w-2xl"
    >
      <div className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
        <p>
          {item.admission.wardName} · Leito {item.admission.bedCode}
          {item.admission.hospitalMrn ? ` · Pront. ${item.admission.hospitalMrn}` : ''}
        </p>
        <p className="mt-1">{item.admission.diagnosis || item.admission.reason || 'Sem diagnóstico'}</p>
      </div>

      {error && (
        <div className="mb-3">
          <ErrorBanner message={error} />
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        {CONDUCT_TAGS.map((t) => {
          const on = tags.includes(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTags((prev) => (on ? prev.filter((x) => x !== t.id) : [...prev, t.id]))}
              className={`rounded-lg border px-2.5 py-1 text-xs ${
                on ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3">
        <Field label="Conduta">
          <Textarea value={conduct} onChange={(e) => setConduct(e.target.value)} rows={3} />
        </Field>
        <Field label="Resposta">
          <Textarea value={response} onChange={(e) => setResponse(e.target.value)} rows={2} />
        </Field>
        <Field label="Intercorrência">
          <Input value={intercurrence} onChange={(e) => setIntercurrence(e.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Dor (0–10)">
            <Input type="number" min={0} max={10} value={painScale} onChange={(e) => setPainScale(e.target.value)} />
          </Field>
          <Field label="Dispneia (0–10)">
            <Input
              type="number"
              min={0}
              max={10}
              value={dyspneaScale}
              onChange={(e) => setDyspneaScale(e.target.value)}
            />
          </Field>
          <Field label="Assistência na mobilização">
            <Input value={mobilityAssist} onChange={(e) => setMobilityAssist(e.target.value)} />
          </Field>
        </div>
        <Field label="Pendência para o próximo">
          <Textarea value={pendingForNext} onChange={(e) => setPendingForNext(e.target.value)} rows={2} />
        </Field>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button disabled={!conduct.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? 'Salvando…' : 'Registrar evolução'}
        </Button>
      </div>

      <div className="mt-6 border-t border-slate-100 pt-4">
        <p className="mb-2 text-sm font-semibold text-slate-800">Últimas evoluções</p>
        {encountersQuery.isLoading ? (
          <Spinner />
        ) : (encountersQuery.data ?? []).length === 0 ? (
          <p className="text-sm text-slate-400">Nenhuma evolução ainda.</p>
        ) : (
          <ul className="space-y-2">
            {(encountersQuery.data ?? []).slice(0, 5).map((e) => (
              <li key={e.id} className="rounded-lg border border-slate-100 p-3 text-sm">
                <p className="text-xs text-slate-400">
                  {new Date(e.conductedAt).toLocaleString('pt-BR')}
                </p>
                <p className="mt-1 text-slate-800">{e.conduct}</p>
                {e.pendingForNext && (
                  <p className="mt-1 text-xs text-amber-700">Pendência: {e.pendingForNext}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

function HandoffModal({
  shiftId,
  users,
  onClose,
  onDone,
}: {
  shiftId: string;
  users: Array<{ id: string; name: string }>;
  onClose: () => void;
  onDone: () => void;
}) {
  const [toUserId, setToUserId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof closeShiftHandoff>> | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      closeShiftHandoff(shiftId, {
        toUserId: toUserId || undefined,
        notes: notes || undefined,
      }),
    onSuccess: (data) => setSummary(data),
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  return (
    <Modal title="Passagem de plantão" onClose={summary ? onDone : onClose}>
      {error && (
        <div className="mb-3">
          <ErrorBanner message={error} />
        </div>
      )}
      {!summary ? (
        <>
          <Field label="Entregar para (opcional)">
            <Select value={toUserId} onChange={(e) => setToUserId(e.target.value)}>
              <option value="">Não informado</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="mt-3">
            <Field label="Observações">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? 'Fechando…' : 'Confirmar passagem'}
            </Button>
          </div>
        </>
      ) : (
        <div className="space-y-3 text-sm">
          <p className="font-medium text-slate-900">Plantão fechado</p>
          <div className="grid grid-cols-2 gap-2">
            <Badge>Atendidos: {summary.summary.doneCount}</Badge>
            <Badge>Pendentes: {summary.summary.pendingCount}</Badge>
            <Badge>Contraindicados: {summary.summary.contraindicatedCount}</Badge>
            <Badge>Altas: {summary.summary.dischargedCount}</Badge>
          </div>
          {summary.summary.pendencies.length > 0 && (
            <ul className="space-y-2">
              {summary.summary.pendencies.map((p) => (
                <li key={p.admissionId} className="rounded-lg bg-amber-50 p-2 text-amber-900">
                  <strong>
                    {p.patientName} ({p.wardName}/{p.bedCode})
                  </strong>
                  : {p.pending}
                </li>
              ))}
            </ul>
          )}
          <Button onClick={onDone}>Fechar</Button>
        </div>
      )}
    </Modal>
  );
}

function AdmitModal({
  hospitalId,
  hospital,
  patients,
  onClose,
  onSaved,
}: {
  hospitalId: string;
  hospital?: { wards: Array<{ id: string; name: string }> };
  patients: Array<{ id: string; name: string; active: boolean }>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [patientId, setPatientId] = useState('');
  const [wardId, setWardId] = useState('');
  const [bedId, setBedId] = useState('');
  const [hospitalMrn, setHospitalMrn] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [reason, setReason] = useState('');
  const [physician, setPhysician] = useState('');
  const [mobilityLevel, setMobilityLevel] = useState('');
  const [assistanceNeeded, setAssistanceNeeded] = useState('');
  const [initialGoals, setInitialGoals] = useState('');
  const [precautions, setPrecautions] = useState<Precautions>({});
  const [error, setError] = useState('');

  const bedsQuery = useQuery({
    queryKey: ['plantao', 'free-beds', hospitalId, wardId],
    queryFn: () => fetchFreeBeds(hospitalId, wardId || undefined),
    enabled: Boolean(hospitalId),
  });

  const mutation = useMutation({
    mutationFn: () =>
      admitPatient({
        patientId,
        hospitalSiteId: hospitalId,
        bedId,
        hospitalMrn: hospitalMrn || undefined,
        diagnosis: diagnosis || undefined,
        reason: reason || undefined,
        responsiblePhysician: physician || undefined,
        mobilityLevel: mobilityLevel || undefined,
        assistanceNeeded: assistanceNeeded || undefined,
        initialGoals: initialGoals || undefined,
        precautions,
      }),
    onSuccess: onSaved,
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  return (
    <Modal title="Nova internação" onClose={onClose} widthClassName="max-w-2xl">
      {error && (
        <div className="mb-3">
          <ErrorBanner message={error} />
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Paciente">
          <Select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
            <option value="">Selecione</option>
            {patients
              .filter((p) => p.active)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Prontuário hospitalar">
          <Input value={hospitalMrn} onChange={(e) => setHospitalMrn(e.target.value)} />
        </Field>
        <Field label="Setor">
          <Select
            value={wardId}
            onChange={(e) => {
              setWardId(e.target.value);
              setBedId('');
            }}
          >
            <option value="">Todos</option>
            {(hospital?.wards ?? []).map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Leito livre">
          <Select value={bedId} onChange={(e) => setBedId(e.target.value)}>
            <option value="">Selecione</option>
            {(bedsQuery.data ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.code}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Motivo">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <Field label="Diagnóstico relevante">
          <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
        </Field>
        <Field label="Médico responsável">
          <Input value={physician} onChange={(e) => setPhysician(e.target.value)} />
        </Field>
        <Field label="Nível de mobilidade">
          <Input value={mobilityLevel} onChange={(e) => setMobilityLevel(e.target.value)} />
        </Field>
        <Field label="Auxílio necessário">
          <Input value={assistanceNeeded} onChange={(e) => setAssistanceNeeded(e.target.value)} />
        </Field>
        <Field label="Metas iniciais">
          <Input value={initialGoals} onChange={(e) => setInitialGoals(e.target.value)} />
        </Field>
      </div>
      <div className="mt-4">
        <p className="mb-2 text-sm font-medium text-slate-700">Precauções / dispositivos</p>
        <div className="flex flex-wrap gap-2">
          {PRECAUTION_FIELDS.map((f) => {
            const on = Boolean(precautions[f.key]);
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setPrecautions((p) => ({ ...p, [f.key]: !on }))}
                className={`rounded-lg border px-2.5 py-1 text-xs ${
                  on ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          disabled={!patientId || !bedId || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          <UserRound className="h-4 w-4" />
          {mutation.isPending ? 'Admitindo…' : 'Admitir'}
        </Button>
      </div>
    </Modal>
  );
}

function DischargeModal({
  admission,
  onClose,
  onSaved,
}: {
  admission: AdmissionDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [destination, setDestination] = useState<DischargeDestination>('HOME');
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const mutation = useMutation({
    mutationFn: () =>
      dischargeAdmission(admission.id, {
        dischargeDestination: destination,
        dischargeSummary: summary || undefined,
      }),
    onSuccess: onSaved,
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  return (
    <Modal title={`Alta — ${admission.patientName}`} onClose={onClose}>
      {error && (
        <div className="mb-3">
          <ErrorBanner message={error} />
        </div>
      )}
      <Field label="Destino">
        <Select
          value={destination}
          onChange={(e) => setDestination(e.target.value as DischargeDestination)}
        >
          <option value="HOME">Casa</option>
          <option value="TRANSFER">Transferência</option>
          <option value="OTHER_WARD">Outro setor</option>
          <option value="DEATH">Óbito</option>
          <option value="OTHER">Outro</option>
        </Select>
      </Field>
      <div className="mt-3">
        <Field label="Resumo de desfecho">
          <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} />
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          Confirmar alta
        </Button>
      </div>
    </Modal>
  );
}

function TransferModal({
  admission,
  onClose,
  onSaved,
}: {
  admission: AdmissionDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [bedId, setBedId] = useState('');
  const [error, setError] = useState('');
  const bedsQuery = useQuery({
    queryKey: ['plantao', 'free-beds', admission.hospitalSiteId],
    queryFn: () => fetchFreeBeds(admission.hospitalSiteId),
  });
  const mutation = useMutation({
    mutationFn: () => transferAdmission(admission.id, bedId),
    onSuccess: onSaved,
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  return (
    <Modal title={`Transferir — ${admission.patientName}`} onClose={onClose}>
      {error && (
        <div className="mb-3">
          <ErrorBanner message={error} />
        </div>
      )}
      <p className="mb-3 text-sm text-slate-500">
        Atual: {admission.wardName} · {admission.bedCode}
      </p>
      <Field label="Novo leito">
        <Select value={bedId} onChange={(e) => setBedId(e.target.value)}>
          <option value="">Selecione</option>
          {(bedsQuery.data ?? []).map((b) => (
            <option key={b.id} value={b.id}>
              {b.code}
            </option>
          ))}
        </Select>
      </Field>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button disabled={!bedId || mutation.isPending} onClick={() => mutation.mutate()}>
          Transferir
        </Button>
      </div>
    </Modal>
  );
}
