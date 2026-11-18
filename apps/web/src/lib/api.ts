import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

export const TOKEN_STORAGE_KEY = 'fisiosuite_token';
export const USER_STORAGE_KEY = 'fisiosuite_user';
export const SESSION_EXPIRED_KEY = 'fisiosuite_session_expired';

export const PLATFORM_TOKEN_STORAGE_KEY = 'fisiosuite_platform_token';
export const PLATFORM_USER_STORAGE_KEY = 'fisiosuite_platform_user';
export const PLATFORM_SESSION_EXPIRED_KEY = 'fisiosuite_platform_session_expired';

const defaultBaseUrl = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const url = config.url ?? '';
  const isPlatform = url.includes('/platform');
  const token = localStorage.getItem(isPlatform ? PLATFORM_TOKEN_STORAGE_KEY : TOKEN_STORAGE_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;
let platformUnauthorizedHandler: UnauthorizedHandler | null = null;
let handlingUnauthorized = false;
let handlingPlatformUnauthorized = false;

export function registerUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

export function registerPlatformUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  platformUnauthorizedHandler = handler;
}

export function clearStoredSession() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

export function clearPlatformSession() {
  localStorage.removeItem(PLATFORM_TOKEN_STORAGE_KEY);
  localStorage.removeItem(PLATFORM_USER_STORAGE_KEY);
}

export function markSessionExpired() {
  sessionStorage.setItem(SESSION_EXPIRED_KEY, '1');
}

export function markPlatformSessionExpired() {
  sessionStorage.setItem(PLATFORM_SESSION_EXPIRED_KEY, '1');
}

export function consumeSessionExpiredFlag(): boolean {
  const flagged = sessionStorage.getItem(SESSION_EXPIRED_KEY) === '1';
  if (flagged) sessionStorage.removeItem(SESSION_EXPIRED_KEY);
  return flagged;
}

export function consumePlatformSessionExpiredFlag(): boolean {
  const flagged = sessionStorage.getItem(PLATFORM_SESSION_EXPIRED_KEY) === '1';
  if (flagged) sessionStorage.removeItem(PLATFORM_SESSION_EXPIRED_KEY);
  return flagged;
}

export function resetUnauthorizedHandling() {
  handlingUnauthorized = false;
}

export function resetPlatformUnauthorizedHandling() {
  handlingPlatformUnauthorized = false;
}

function isPublicAuthRequest(config?: InternalAxiosRequestConfig) {
  const url = config?.url ?? '';
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register-clinic') ||
    url.includes('/platform/auth/login')
  );
}

function isPlatformRequest(config?: InternalAxiosRequestConfig) {
  return (config?.url ?? '').includes('/platform');
}

export function isUnauthorizedError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isUnauthorizedError(error) && !isPublicAuthRequest(error.config)) {
      if (isPlatformRequest(error.config)) {
        if (!handlingPlatformUnauthorized) {
          handlingPlatformUnauthorized = true;
          markPlatformSessionExpired();
          clearPlatformSession();
          platformUnauthorizedHandler?.();
        }
      } else if (!handlingUnauthorized) {
        handlingUnauthorized = true;
        markSessionExpired();
        clearStoredSession();
        unauthorizedHandler?.();
      }
    }
    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
  if (isUnauthorizedError(error)) {
    return '';
  }

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string | string[] }>;
    const data = axiosError.response?.data;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(', ') : data.message;
    }
    if (axiosError.message) return axiosError.message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
