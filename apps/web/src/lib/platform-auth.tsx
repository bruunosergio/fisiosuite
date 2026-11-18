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
  PLATFORM_TOKEN_STORAGE_KEY,
  PLATFORM_USER_STORAGE_KEY,
  clearPlatformSession,
  registerPlatformUnauthorizedHandler,
  resetPlatformUnauthorizedHandling,
} from './api';
import { platformLoginRequest } from './queries';
import type { PlatformAdmin } from './types';

type PlatformAuthContextValue = {
  admin: PlatformAdmin | null;
  token: string | null;
  initializing: boolean;
  login: (payload: { email: string; password: string }) => Promise<void>;
  logout: () => void;
};

const PlatformAuthContext = createContext<PlatformAuthContextValue | undefined>(undefined);

export function PlatformAuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [admin, setAdmin] = useState<PlatformAdmin | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  const endSession = useCallback(() => {
    clearPlatformSession();
    setToken(null);
    setAdmin(null);
    queryClient.removeQueries({ queryKey: ['platform'] });
  }, [queryClient]);

  useEffect(() => {
    const storedToken = localStorage.getItem(PLATFORM_TOKEN_STORAGE_KEY);
    const storedAdmin = localStorage.getItem(PLATFORM_USER_STORAGE_KEY);
    if (storedToken && storedAdmin) {
      try {
        setAdmin(JSON.parse(storedAdmin) as PlatformAdmin);
        setToken(storedToken);
      } catch {
        clearPlatformSession();
      }
    }
    setInitializing(false);
  }, []);

  useEffect(() => {
    registerPlatformUnauthorizedHandler(() => {
      endSession();
      navigate('/platform/login', { replace: true });
    });
    return () => registerPlatformUnauthorizedHandler(null);
  }, [endSession, navigate]);

  const login = useCallback(async (payload: { email: string; password: string }) => {
    const { accessToken, admin: nextAdmin } = await platformLoginRequest(payload);
    localStorage.setItem(PLATFORM_TOKEN_STORAGE_KEY, accessToken);
    localStorage.setItem(PLATFORM_USER_STORAGE_KEY, JSON.stringify(nextAdmin));
    setToken(accessToken);
    setAdmin(nextAdmin);
    resetPlatformUnauthorizedHandling();
  }, []);

  const logout = useCallback(() => {
    endSession();
  }, [endSession]);

  const value = useMemo(
    () => ({ admin, token, initializing, login, logout }),
    [admin, token, initializing, login, logout],
  );

  return <PlatformAuthContext.Provider value={value}>{children}</PlatformAuthContext.Provider>;
}

export function usePlatformAuth(): PlatformAuthContextValue {
  const ctx = useContext(PlatformAuthContext);
  if (!ctx) {
    throw new Error('usePlatformAuth deve ser usado dentro de PlatformAuthProvider');
  }
  return ctx;
}
