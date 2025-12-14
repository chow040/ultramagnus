import React from 'react';
import JobStatusBadge from './JobStatusBadge';
import type { AnalysisType, JobStatus } from '../../services/jobClient';

export interface JobHistoryItem {
  id: string;
  ticker: string;
  status: JobStatus;
  analysisType: AnalysisType;
  createdAt?: string;
  completedAt?: string | null;
  reportId?: string | null;
}

interface Props {
  jobs: JobHistoryItem[];
  onSelect?: (id: string) => void;
}

const JobHistoryList: React.FC<Props> = ({ jobs, onSelect }) => {
  const rows = jobs.sort((a, b) => (new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
  return (
    <div className="border border-slate-200 rounded-md divide-y divide-slate-200 bg-white">
      {rows.length === 0 ? (
        <div className="p-4 text-xs text-slate-500">No recent jobs</div>
      ) : (
        rows.map((job) => (
          <button
            key={job.id}
            onClick={() => onSelect?.(job.id)}
            className="w-full text-left p-4 hover:bg-slate-50 flex items-center justify-between gap-3"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <span className="font-mono text-xs">{job.ticker}</span>
                <JobStatusBadge status={job.status} analysisType={job.analysisType} size="sm" />
              </div>
              <div className="text-[11px] text-slate-500">
                {job.createdAt ? new Date(job.createdAt).toLocaleString() : 'Created'}
              </div>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">{job.id.slice(0, 8)}…</div>
          </button>
        ))
      )}
    </div>
  );
};

export default JobHistoryList;
