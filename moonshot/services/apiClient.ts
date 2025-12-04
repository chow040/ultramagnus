import { logger } from '../src/lib/logger';
import { generateRequestId, getSessionId } from '../src/lib/requestId';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const toUrl = (path: string) => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${API_BASE}${path}`;
};

export class ApiError extends Error {
  status: number;

  requestId?: string;

  body?: unknown;

  constructor(message: string, status: number, requestId?: string, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.requestId = requestId;
    this.body = body;
  }
}

interface ApiFetchOptions {
  withCredentials?: boolean;
  operation?: string;
  headers?: HeadersInit;
}

export interface ApiResponse<T = unknown> {
  data: T;
  requestId: string;
}

let refreshInFlight: Promise<void> | null = null;

const triggerRefresh = async () => {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(toUrl('/api/auth/refresh'), {
          method: 'POST',
          credentials: 'include'
        });
        if (!res.ok) {
          throw new Error(`refresh_failed_${res.status}`);
        }
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
};

export const apiFetch = async (path: string, init: RequestInit = {}, options: ApiFetchOptions = {}) => {
  const requestId = generateRequestId('http');
  const url = toUrl(path);
  const headers = new Headers(options.headers || init.headers || {});
  headers.set('X-Request-ID', requestId);
  headers.set('X-Client-Timestamp', new Date().toISOString());
  headers.set('X-Session-ID', getSessionId());

  const credentials = options.withCredentials === false
    ? init.credentials ?? 'omit'
    : init.credentials ?? 'include';

  const fetchInit: RequestInit = {
    ...init,
    headers,
    credentials
  };

  const method = (fetchInit.method || 'GET').toUpperCase();
  const startedAt = performance.now();

  try {
    const response = await fetch(url, fetchInit);
    const durationMs = Math.round(performance.now() - startedAt);

    const logBase = {
      requestId,
      url,
      method,
      statusCode: response.status,
      durationMs,
      operation: options.operation
    };

    if (!response.ok) {
      logger.warn('api.request.failed', logBase);
    } else {
      logger.info('api.request.completed', logBase);
    }

    return { response, requestId };
  } catch (error) {
    logger.captureError(error, {
      meta: {
        requestId,
        url,
        method,
        operation: options.operation
      }
    });
    throw error;
  }
};

export const apiJson = async <T>(path: string, init: RequestInit = {}, options: ApiFetchOptions = {}): Promise<ApiResponse<T>> => {
  const { response, requestId } = await apiFetch(path, init, options);
  let data: unknown = null;
  try {
    const text = await response.text();
    data = text ? JSON.parse(text) : {};
  } catch (error) {
    logger.captureError(error, {
      requestId,
      meta: { path, operation: options.operation }
    });
    data = {};
  }

  if (!response.ok) {
    const message = (data as any)?.error || `Request failed with status ${response.status}`;
    if (response.status === 401 && options.operation !== 'auth.refresh' && (options as any).allowRefresh !== false) {
      try {
        await triggerRefresh();
        return apiJson<T>(path, init, { ...options, allowRefresh: false });
      } catch (err) {
        // fall through to throw original error
      }
    }
    throw new ApiError(message, response.status, requestId, data);
  }

  return { data: data as T, requestId };
};
