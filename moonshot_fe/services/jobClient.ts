import { apiJson } from './apiClient';

export type AnalysisType = 'gemini' | 'langgraph';
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'canceled' | 'retrying';

export interface CreateJobResponse {
  jobId: string;
  status: JobStatus;
  ticker: string;
  analysisType: AnalysisType;
  reportId?: string;
  estimatedDuration?: string;
  createdAt?: string;
  deduped?: boolean;
  // Inline LangChain response shortcut (when not queued)
  report?: any;
  materiality?: any;
  previous?: any;
}

export interface JobDetail {
  id: string;
  userId: string;
  ticker: string;
  analysisType: AnalysisType;
  status: JobStatus;
  priority: number;
  reportId?: string | null;
  error?: string | null;
  createdAt?: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

export const createAnalysisJob = async (ticker: string, analysisType: AnalysisType): Promise<CreateJobResponse> => {
  // LangChain v2 assessment endpoint (direct, non-queued)
  const { data } = await apiJson<any>('/api/ai/assessment-v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticker })
  });

  return {
    jobId: `inline-${Date.now()}`,
    status: 'completed',
    ticker,
    analysisType: 'langgraph',
    reportId: data?.reportId,
    report: data?.report,
    materiality: data?.materiality,
    previous: data?.previous
  };
};

export const getJobById = async (jobId: string): Promise<JobDetail> => {
  const { data } = await apiJson<JobDetail>(`/api/jobs/${jobId}`);
  return data;
};
