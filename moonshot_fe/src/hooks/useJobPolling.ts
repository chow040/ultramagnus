import { useEffect, useRef, useState } from 'react';
import { getJobById, JobDetail, JobStatus } from '../../services/jobClient';

interface Options {
  jobId: string | null;
  enabled?: boolean;
  initialStatus?: JobStatus | null;
  intervalMs?: number;
  backoffMs?: number[];
  onComplete?: (detail: JobDetail) => void;
  onFail?: (detail: JobDetail) => void;
}

interface State {
  status: JobStatus | null;
  reportId?: string | null;
  error?: string | null;
  detail?: JobDetail | null;
  isPolling: boolean;
}

const ACTIVE_JOBS_KEY = 'ultramagnus_active_jobs';
const inFlight: Record<string, boolean> = {};
const lastPolledAt: Record<string, number> = {};
const DEFAULT_BACKOFF = [2000, 3000, 5000, 8000];

export const loadActiveJobs = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ACTIVE_JOBS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveActiveJobs = (jobs: string[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACTIVE_JOBS_KEY, JSON.stringify(jobs));
  } catch {
    // ignore
  }
};

export const addActiveJob = (jobId: string) => {
  const existing = loadActiveJobs();
  if (existing.includes(jobId)) return;
  saveActiveJobs([...existing, jobId]);
};

export const removeActiveJob = (jobId: string) => {
  const existing = loadActiveJobs();
  const next = existing.filter((id) => id !== jobId);
  saveActiveJobs(next);
};

export const useJobPolling = ({
  jobId,
  enabled = true,
  initialStatus = null,
  intervalMs = 2000,
  backoffMs,
  onComplete,
  onFail
}: Options) => {
  const [state, setState] = useState<State>({ status: initialStatus, isPolling: false });
  const timerRef = useRef<number | null>(null);
  const backoffIndexRef = useRef(0);
  const onCompleteRef = useRef<typeof onComplete>();
  const onFailRef = useRef<typeof onFail>();
  const backoffPlan = backoffMs && backoffMs.length ? backoffMs : DEFAULT_BACKOFF;

  // keep latest callbacks without re-running poll effect
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onFailRef.current = onFail;
  }, [onFail]);

  useEffect(() => {
    if (!jobId || !enabled) return;
    addActiveJob(jobId);
    setState((prev) => ({ ...prev, isPolling: true }));

    const clear = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const poll = async () => {
      if (!jobId) return;
      if (inFlight[jobId]) {
        timerRef.current = window.setTimeout(poll, intervalMs);
        return;
      }

      const now = Date.now();
      const elapsed = now - (lastPolledAt[jobId] || 0);
      if (elapsed < intervalMs) {
        timerRef.current = window.setTimeout(poll, intervalMs - elapsed);
        return;
      }

      inFlight[jobId] = true;
      lastPolledAt[jobId] = now;
      try {
        const detail = await getJobById(jobId);
        setState({
          status: detail.status,
          reportId: detail.reportId,
          error: detail.error,
          detail,
          isPolling: !['completed', 'failed', 'canceled'].includes(detail.status)
        });

        if (detail.status === 'completed') {
          removeActiveJob(jobId);
          onCompleteRef.current?.(detail);
          clear();
          delete inFlight[jobId];
          delete lastPolledAt[jobId];
          return;
        }

        if (detail.status === 'failed' || detail.status === 'canceled') {
          removeActiveJob(jobId);
          onFailRef.current?.(detail);
          clear();
          delete inFlight[jobId];
          delete lastPolledAt[jobId];
          return;
        }

        const nextDelay = backoffPlan[Math.min(backoffIndexRef.current, backoffPlan.length - 1)] || intervalMs;
        backoffIndexRef.current = Math.min(backoffIndexRef.current + 1, backoffPlan.length - 1);
        timerRef.current = window.setTimeout(poll, nextDelay);
      } catch (err: any) {
        const nextDelay = backoffPlan[Math.min(backoffIndexRef.current, backoffPlan.length - 1)] || intervalMs;
        backoffIndexRef.current = Math.min(backoffIndexRef.current + 1, backoffPlan.length - 1);
        timerRef.current = window.setTimeout(poll, nextDelay);
      } finally {
        delete inFlight[jobId];
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        clear();
      } else if (!timerRef.current) {
        backoffIndexRef.current = 0;
        poll();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    poll();

    return () => {
      clear();
      document.removeEventListener('visibilitychange', handleVisibility);
      if (jobId) {
        delete inFlight[jobId];
      }
    };
  }, [jobId, enabled, intervalMs, backoffPlan]);

  return state;
};
