import React from 'react';
import JobStatusBadge from './JobStatusBadge';
import type { AnalysisType, JobStatus } from '../../services/jobClient';

interface Props {
  ticker: string;
  status: JobStatus;
  analysisType: AnalysisType;
  progress?: number;
  phase?: string;
  error?: string | null;
  startedAt?: string | null;
  createdAt?: string | null;
  onCancel?: () => void;
  onView?: () => void;
}

const ProgressBar = ({ value = 0 }: { value?: number }) => (
  <div className="w-full h-2 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
    <div className="h-full bg-slate-800 transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
  </div>
);

const JobProgressCard: React.FC<Props> = ({
  ticker,
  status,
  analysisType,
  progress = 0,
  phase,
  error,
  startedAt,
  createdAt,
  onCancel,
  onView
}) => {
  const showActions = status === 'pending' || status === 'processing' || status === 'retrying';
  const neutralPanel = 'border border-slate-200 bg-white shadow-sm rounded-md p-4 flex flex-col gap-3';
  const subtleText = 'text-xs text-slate-500';

  const meta = [
    createdAt ? `Created: ${new Date(createdAt).toLocaleTimeString()}` : null,
    startedAt ? `Started: ${new Date(startedAt).toLocaleTimeString()}` : null
  ].filter(Boolean).join(' · ');

  return (
    <div className={neutralPanel}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="text-lg font-semibold tracking-tight text-slate-900">{ticker}</div>
          <JobStatusBadge status={status} analysisType={analysisType} size="sm" hideWhenProcessing />
        </div>
        {showActions && onCancel ? (
          <button
            onClick={onCancel}
            className="text-xs font-medium text-slate-600 border border-slate-200 rounded-full px-3 py-1 hover:bg-slate-50"
          >
            Cancel
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <ProgressBar value={progress} />
        <span className="text-[11px] text-slate-600 w-12 text-right">{Math.round(progress)}%</span>
      </div>

      <div className={subtleText}>{phase || 'Working...'}</div>
      {meta ? <div className={`${subtleText} opacity-80`}>{meta}</div> : null}
      {error ? <div className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded p-2">{error}</div> : null}

      {status === 'completed' && onView ? (
        <button
          onClick={onView}
          className="self-start text-xs font-medium text-slate-900 border border-slate-300 rounded-full px-3 py-1 hover:bg-slate-50"
        >
          View report
        </button>
      ) : null}
    </div>
  );
};

export default JobProgressCard;
