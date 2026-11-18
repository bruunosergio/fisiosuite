import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { getApiErrorMessage } from '../lib/api';
import { Button, ErrorBanner, Field, Input } from '../components/ui';

type FormState = {
  clinicName: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  phone: string;
};

export default function RegisterClinicPage() {
  const { registerClinic } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>({
    clinicName: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    phone: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await registerClinic({
        clinicName: form.clinicName,
        adminName: form.adminName,
        adminEmail: form.adminEmail,
        adminPassword: form.adminPassword,
        phone: form.phone || undefined,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível criar a clínica.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Activity className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Criar clínica no FisioSuite</h1>
          <p className="mt-1 text-center text-sm text-slate-500">Cadastre sua clínica e o usuário administrador</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-card">
          {error && <ErrorBanner message={error} />}

          <Field label="Nome da clínica">
            <Input
              required
              value={form.clinicName}
              onChange={(e) => update('clinicName', e.target.value)}
              placeholder="Clínica Movimento Saudável"
            />
          </Field>

          <Field label="Seu nome">
            <Input required value={form.adminName} onChange={(e) => update('adminName', e.target.value)} placeholder="Nome completo" />
          </Field>

          <Field label="E-mail do administrador">
            <Input
              type="email"
              required
              value={form.adminEmail}
              onChange={(e) => update('adminEmail', e.target.value)}
              placeholder="voce@clinica.com.br"
            />
          </Field>

          <Field label="Telefone (opcional)">
            <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="(11) 99999-9999" />
          </Field>

          <Field label="Senha">
            <Input
              type="password"
              required
              minLength={6}
              value={form.adminPassword}
              onChange={(e) => update('adminPassword', e.target.value)}
              placeholder="Mínimo de 6 caracteres"
            />
          </Field>

          <Button type="submit" className="w-full" loading={loading}>
            Criar clínica
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Já tem uma conta?{' '}
          <Link to="/login" className="font-medium text-brand-700 hover:text-brand-800">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
