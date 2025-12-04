import { apiFetch, apiJson } from './apiClient';
import { logger } from '../src/lib/logger';

interface SessionResponse {
  user?: {
    id?: string;
    email?: string;
  };
  profile?: {
    id?: string;
    email?: string;
    display_name?: string;
    name?: string;
    tier?: string;
    join_date?: string;
  };
}

export const signup = async (email: string, password: string, displayName?: string) => {
  const { data } = await apiJson('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName })
  }, { operation: 'auth.signup' });

  return data;
};

export const login = async (email: string, password: string) => {
  const { data } = await apiJson('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  }, { operation: 'auth.login' });

  return data;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export const startGoogle = () => {
  window.location.href = `${API_BASE}/api/auth/google/start`;
};

export const fetchMe = async (): Promise<SessionResponse> => {
  const { data, requestId } = await apiJson<SessionResponse>('/api/auth/me', {
    headers: { 'Content-Type': 'application/json' }
  }, { operation: 'auth.me' });

  logger.info('auth.session.loaded', { requestId });
  return data;
};

export const resendVerification = async (email: string) => {
  const { data } = await apiJson('/api/auth/resend-verification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  }, { operation: 'auth.resend_verification', withCredentials: false });
  return data;
};

export const logout = async () => {
  await apiFetch('/api/auth/logout', { method: 'POST' }, { operation: 'auth.logout' });
  logger.info('auth.logout');
};
