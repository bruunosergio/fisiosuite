import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { Card, EmptyState, Field, PageHeader, Select, Spinner } from '../../components/ui';
import { fetchPatients } from '../../lib/queries';
import { formatDate } from '../../lib/format';
import AnamnesisTab from './AnamnesisTab';
import AnthropometryTab from './AnthropometryTab';
import EnergyTab from './EnergyTab';
import MealPlanTab from './MealPlanTab';
import EvolutionTab from './EvolutionTab';
import GoalsTab from './GoalsTab';

const TABS = [
  { id: 'anamnesis', label: 'Anamnese' },
  { id: 'anthropometry', label: 'Antropometria' },
  { id: 'energy', label: 'Gasto energético' },
  { id: 'plan', label: 'Plano alimentar' },
  { id: 'evolution', label: 'Evolução' },
  { id: 'goals', label: 'Metas' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const SEX_LABEL = { FEMALE: 'Feminino', MALE: 'Masculino', UNSPECIFIED: 'Não informado' } as const;
const PATIENT_KEY = 'fisiosuite.nutrition.patientId';

export default function NutritionPage() {
  const [patientId, setPatientId] = useState(() => sessionStorage.getItem(PATIENT_KEY) ?? '');
  const [tab, setTab] = useState<TabId>('anamnesis');

  const patientsQuery = useQuery({ queryKey: ['patients'], queryFn: fetchPatients });
  const patients = patientsQuery.data ?? [];
  const patient = patients.find((p) => p.id === patientId) ?? null;

  useEffect(() => {
    if (patientsQuery.data && patientId && !patient) {
      setPatientId('');
      sessionStorage.removeItem(PATIENT_KEY);
    }
  }, [patientsQuery.data, patientId, patient]);

  function selectPatient(id: string) {
    setPatientId(id);
    if (id) sessionStorage.setItem(PATIENT_KEY, id);
    else sessionStorage.removeItem(PATIENT_KEY);
  }

  return (
    <div>
      <PageHeader
        title="Nutrição"
        description="Anamnese, antropometria, gasto energético, plano alimentar, evolução e metas."
      />

      <Card className="mb-6">
        <div className="grid items-end gap-4 sm:grid-cols-3">
          <Field label="Paciente">
            <Select value={patientId} onChange={(e) => selectPatient(e.target.value)} disabled={patientsQuery.isLoading}>
              <option value="">Selecione um paciente</option>
              {patients
                .filter((p) => p.active)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </Select>
          </Field>
          {patient && (
            <div className="text-sm text-slate-600 sm:col-span-2">
              <p>
                <span className="text-slate-400">Nascimento:</span> {formatDate(patient.birthDate)} ·{' '}
                <span className="text-slate-400">Sexo:</span>{' '}
                {patient.biologicalSex ? SEX_LABEL[patient.biologicalSex] : 'Não informado'}
              </p>
              {(patient.allergiesSummary || patient.dietaryRestrictions) && (
                <p className="text-xs text-amber-700">
                  {patient.allergiesSummary && <>Alergias: {patient.allergiesSummary}. </>}
                  {patient.dietaryRestrictions && <>Restrições: {patient.dietaryRestrictions}.</>}
                </p>
              )}
            </div>
          )}
        </div>
      </Card>

      {patientsQuery.isLoading ? (
        <Spinner />
      ) : !patient ? (
        <EmptyState
          title="Selecione um paciente para começar"
          description={patients.length ? undefined : 'Cadastre um paciente em Pacientes antes de iniciar o atendimento.'}
        />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-1 border-b border-slate-200">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={clsx(
                  '-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                  tab === t.id
                    ? 'border-brand-600 text-brand-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'anamnesis' && <AnamnesisTab key={patient.id} patient={patient} />}
          {tab === 'anthropometry' && <AnthropometryTab key={patient.id} patient={patient} />}
          {tab === 'energy' && <EnergyTab key={patient.id} patient={patient} />}
          {tab === 'plan' && <MealPlanTab key={patient.id} patient={patient} />}
          {tab === 'evolution' && <EvolutionTab key={patient.id} patient={patient} />}
          {tab === 'goals' && <GoalsTab key={patient.id} patient={patient} />}
        </>
      )}
    </div>
  );
}
