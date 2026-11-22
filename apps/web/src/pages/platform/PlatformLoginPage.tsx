import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { usePlatformAuth } from '../../lib/platform-auth';
import { consumePlatformSessionExpiredFlag, getApiErrorMessage } from '../../lib/api';
import { Button, ErrorBanner, Field, Input } from '../../components/ui';

export default function PlatformLoginPage() {
  const { login } = usePlatformAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (consumePlatformSessionExpiredFlag()) {
      setSessionNotice('Sua sessão da plataforma expirou. Entre novamente.');
    }
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSessionNotice(null);
    setLoading(true);
    try {
      await login({ email, password });
      navigate('/platform', { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível entrar. Verifique as credenciais.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
            <Shield className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">FisioSuite Platform</h1>
          <p className="mt-1 text-sm text-slate-500">Acesso do administrador da plataforma</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-card"
        >
          {sessionNotice && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {sessionNotice}
            </div>
          )}
          {error && <ErrorBanner message={error} />}

          <Field label="E-mail">
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="platform@fisiosuite.admin"
              autoComplete="username"
            />
          </Field>

          <Field label="Senha">
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </Field>

          <Button type="submit" className="w-full" loading={loading}>
            Entrar na plataforma
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          É usuário de clínica?{' '}
          <Link to="/login" className="font-medium text-brand-700 hover:text-brand-800">
            Ir para login da clínica
          </Link>
        </p>
      </div>
    </div>
  );
}
