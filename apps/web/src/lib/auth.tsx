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
  TOKEN_STORAGE_KEY,
  USER_STORAGE_KEY,
  clearStoredSession,
  registerUnauthorizedHandler,
  resetUnauthorizedHandling,
} from './api';
import { loginRequest, registerClinicRequest } from './queries';
import type { User } from './types';

type LoginPayload = { email: string; password: string };

type RegisterClinicPayload = {
  clinicName: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  phone?: string;
};

type AuthContextValue = {
  user: User | null;
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
  const [initializing, setInitializing] = useState(true);

  const endSession = useCallback(() => {
    clearStoredSession();
    setToken(null);
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (storedToken && storedUser) {
      try {
        setUser(JSON.parse(storedUser) as User);
        setToken(storedToken);
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

  const persistSession = useCallback((accessToken: string, nextUser: User) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
    setToken(accessToken);
    setUser(nextUser);
    resetUnauthorizedHandling();
  }, []);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const { accessToken, user: loggedUser } = await loginRequest(payload);
      persistSession(accessToken, loggedUser);
    },
    [persistSession],
  );

  const registerClinic = useCallback(
    async (payload: RegisterClinicPayload) => {
      const { accessToken, user: createdUser } = await registerClinicRequest(payload);
      persistSession(accessToken, createdUser);
    },
    [persistSession],
  );

  const logout = useCallback(() => {
    endSession();
  }, [endSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, initializing, login, registerClinic, logout }),
    [user, token, initializing, login, registerClinic, logout],
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
