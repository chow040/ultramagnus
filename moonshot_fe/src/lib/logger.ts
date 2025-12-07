import { generateRequestId, getSessionId } from './requestId';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = {
  requestId?: string;
  correlationId?: string;
  route?: string;
  userId?: string | null;
  componentStack?: string;
  errorName?: string;
  errorMessage?: string;
  errorStack?: string;
  meta?: Record<string, unknown>;
};

export interface LogRecord extends LogContext {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  sessionId: string;
  browser?: {
    userAgent?: string;
    language?: string;
    platform?: string;
  };
  url?: string;
  source: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const LOG_ENDPOINT = `${API_BASE || ''}/api/logs`;
const LOG_BATCH_INTERVAL_MS = Number(import.meta.env.VITE_LOG_BATCH_INTERVAL_MS || 5000);
const MAX_BATCH_SIZE = Number(import.meta.env.VITE_LOG_MAX_BATCH || 15);
const MAX_BUFFER = Number(import.meta.env.VITE_LOG_BUFFER_LIMIT || 200);

const getBrowserMeta = () => {
  if (typeof navigator === 'undefined') {
    return undefined;
  }
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform
  };
};

const sanitizeMeta = (input?: Record<string, unknown> | null) => {
  if (!input) return undefined;
  const copy: Record<string, unknown> = {};
  Object.entries(input).forEach(([key, value]) => {
    if (value == null) return;
    if (typeof value === 'string' && value.length > 500) {
      copy[key] = `${value.slice(0, 497)}...`;
      return;
    }
    copy[key] = value;
  });
  return Object.keys(copy).length ? copy : undefined;
};

const fingerprint = (value?: string | null) => {
  if (!value) return undefined;
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
};

class FrontendLogger {
  private buffer: LogRecord[] = [];

  private flushTimer: number | null = null;

  private route: string | undefined;

  private userId: string | undefined;

  private userHash: string | undefined;

  private handlersRegistered = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.registerGlobalHandlers();
    }
  }

  setUser(user?: { id?: string | null; email?: string | null }) {
    this.userId = user?.id || undefined;
    this.userHash = fingerprint(user?.email || undefined);
  }

  clearUser() {
    this.userId = undefined;
    this.userHash = undefined;
  }

  setRoute(route: string) {
    this.route = route;
  }

  getSessionId() {
    return getSessionId();
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context);
  }

  captureError(error: unknown, context?: LogContext) {
    if (error instanceof Error) {
      this.error(error.message, {
        ...context,
        errorName: error.name,
        errorStack: error.stack
      });
    } else {
      this.error('unknown_error', { ...context, meta: { error } });
    }
  }

  flush(immediate = false) {
    if (!this.buffer.length) return;
    if (!immediate && this.flushTimer) return;

    const batch = this.buffer.splice(0, MAX_BATCH_SIZE);
    this.sendBatch(batch);

    if (this.buffer.length) {
      this.scheduleFlush();
    } else if (this.flushTimer) {
      window.clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    const record: LogRecord = {
      id: generateRequestId('log'),
      timestamp: new Date().toISOString(),
      level,
      message,
      sessionId: getSessionId(),
      source: 'moonshot-fe',
      route: context?.route || this.route || (typeof window !== 'undefined' ? window.location.pathname : undefined),
      requestId: context?.requestId,
      correlationId: context?.correlationId,
      userId: context?.userId ?? this.userId,
      browser: getBrowserMeta(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      componentStack: context?.componentStack,
      errorName: context?.errorName,
      errorMessage: context?.errorMessage,
      errorStack: context?.errorStack,
      meta: sanitizeMeta({
        ...context?.meta,
        userHash: this.userHash
      })
    };

    if (import.meta.env.DEV) {
      const logMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
      logMethod('[logger]', message, record);
    }

    this.buffer.push(record);
    if (this.buffer.length > MAX_BUFFER) {
      this.buffer = this.buffer.slice(-MAX_BUFFER);
    }

    if (level === 'error' || this.buffer.length >= MAX_BATCH_SIZE) {
      this.flush(true);
    } else {
      this.scheduleFlush();
    }
  }

  private scheduleFlush() {
    if (this.flushTimer || typeof window === 'undefined') return;
    this.flushTimer = window.setTimeout(() => {
      this.flushTimer = null;
      this.flush();
    }, LOG_BATCH_INTERVAL_MS);
  }

  private async sendBatch(batch: LogRecord[]) {
    if (!batch.length) return;
    const payload = JSON.stringify({ logs: batch });
    const url = LOG_ENDPOINT;

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function' && document.visibilityState === 'hidden') {
      const blob = new Blob([payload], { type: 'application/json' });
      const ok = navigator.sendBeacon(url, blob);
      if (!ok) {
        this.buffer.unshift(...batch);
      }
      return;
    }

    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      });
    } catch (err) {
      this.buffer.unshift(...batch);
      if (this.buffer.length > MAX_BUFFER) {
        this.buffer = this.buffer.slice(-MAX_BUFFER);
      }
      if (import.meta.env.DEV) {
        console.error('[logger] Failed to transmit logs', err);
      }
    }
  }

  private registerGlobalHandlers() {
    if (this.handlersRegistered || typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
      this.error('browser.error', {
        errorMessage: event.message,
        errorStack: event.error?.stack,
        errorName: event.error?.name || 'Error',
        meta: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      this.error('browser.unhandled_rejection', {
        errorMessage: reason.message,
        errorStack: reason.stack,
        errorName: reason.name
      });
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush(true);
      }
    });

    window.addEventListener('beforeunload', () => this.flush(true));

    this.handlersRegistered = true;
  }
}

export const logger = new FrontendLogger();
