import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ENABLED_MODULES_STORAGE_KEY,
  TOKEN_STORAGE_KEY,
  USER_STORAGE_KEY,
  clearStoredSession,
  registerUnauthorizedHandler,
  resetUnauthorizedHandling,
} from './api';
import { loginRequest, registerClinicRequest } from './queries';
import type { Specialty, User } from './types';

const DEFAULT_MODULES: Specialty[] = ['FISIOTERAPIA'];
const VALID_MODULES: Specialty[] = ['FISIOTERAPIA', 'NUTRICAO'];

function normalizeModules(value: unknown): Specialty[] {
  if (!Array.isArray(value)) return DEFAULT_MODULES;
  const modules = value.filter((m): m is Specialty => VALID_MODULES.includes(m as Specialty));
  return modules.length ? modules : DEFAULT_MODULES;
}

function readStoredModules(): Specialty[] {
  try {
    const raw = localStorage.getItem(ENABLED_MODULES_STORAGE_KEY);
    return raw ? normalizeModules(JSON.parse(raw)) : DEFAULT_MODULES;
  } catch {
    return DEFAULT_MODULES;
  }
}

type LoginPayload = { email: string; password: string };

type RegisterClinicPayload = {
  clinicName: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  phone?: string;
  enabledModules?: Specialty[];
};

type AuthContextValue = {
  user: User | null;
  enabledModules: Specialty[];
  token: string | null;
  initializing: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  registerClinic: (payload: RegisterClinicPayload) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [enabledModules, setEnabledModules] = useState<Specialty[]>(DEFAULT_MODULES);
  const [initializing, setInitializing] = useState(true);

  const endSession = useCallback(() => {
    clearStoredSession();
    setToken(null);
    setUser(null);
    setEnabledModules(DEFAULT_MODULES);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (storedToken && storedUser) {
      try {
        setUser(JSON.parse(storedUser) as User);
        setToken(storedToken);
        setEnabledModules(readStoredModules());
      } catch {
        clearStoredSession();
      }
    }
    setInitializing(false);
  }, []);

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      endSession();
      navigate('/login', { replace: true });
    });
    return () => registerUnauthorizedHandler(null);
  }, [endSession, navigate]);

  const persistSession = useCallback((accessToken: string, nextUser: User, modules?: unknown) => {
    const nextModules = normalizeModules(modules);
    localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
    localStorage.setItem(ENABLED_MODULES_STORAGE_KEY, JSON.stringify(nextModules));
    setToken(accessToken);
    setUser(nextUser);
    setEnabledModules(nextModules);
    resetUnauthorizedHandling();
  }, []);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const { accessToken, user: loggedUser, enabledModules: modules } = await loginRequest(payload);
      persistSession(accessToken, loggedUser, modules);
    },
    [persistSession],
  );

  const registerClinic = useCallback(
    async (payload: RegisterClinicPayload) => {
      const {
        accessToken,
        user: createdUser,
        enabledModules: modules,
      } = await registerClinicRequest(payload);
      persistSession(accessToken, createdUser, modules);
    },
    [persistSession],
  );

  const logout = useCallback(() => {
    endSession();
  }, [endSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, enabledModules, token, initializing, login, registerClinic, logout }),
    [user, enabledModules, token, initializing, login, registerClinic, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return ctx;
}
