import React from 'react';
import type { AnalysisType, JobStatus } from '../../services/jobClient';

interface Props {
  status: JobStatus;
  analysisType?: AnalysisType;
  size?: 'sm' | 'md';
  hideWhenProcessing?: boolean;
}

const statusStyles: Record<JobStatus, { label: string; tone: string; text: string }> = {
  pending: { label: 'Queued', tone: 'bg-slate-100 border-slate-300', text: 'text-slate-700' },
  processing: { label: 'Processing', tone: 'bg-amber-100 border-amber-200', text: 'text-amber-800' },
  retrying: { label: 'Retrying', tone: 'bg-amber-100 border-amber-200', text: 'text-amber-800' },
  completed: { label: 'Completed', tone: 'bg-emerald-100 border-emerald-200', text: 'text-emerald-800' },
  failed: { label: 'Failed', tone: 'bg-rose-100 border-rose-200', text: 'text-rose-800' },
  canceled: { label: 'Canceled', tone: 'bg-slate-100 border-slate-200', text: 'text-slate-600' }
};

const JobStatusBadge: React.FC<Props> = ({ status, analysisType, size = 'md', hideWhenProcessing = false }) => {
  if (hideWhenProcessing && status === 'processing') return null;
  const style = statusStyles[status];
  const padding = size === 'sm' ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs';
  const pill = 'inline-flex items-center gap-2 rounded-full border uppercase tracking-tight';
  return (
    <span className={`${pill} ${padding} ${style.tone} ${style.text}`}>
      <span className="h-2 w-2 rounded-full bg-current" aria-hidden />
      <span>{style.label}</span>
      {analysisType ? <span className="text-[10px] font-medium lowercase opacity-70">{analysisType}</span> : null}
    </span>
  );
};

export default JobStatusBadge;
