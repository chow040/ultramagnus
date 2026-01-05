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
  report?: any;
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
  // Non-LangChain inline endpoint
  const { data } = await apiJson<any>('/api/ai/stream-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticker })
  });

  return {
    jobId: `inline-${Date.now()}`,
    status: 'completed',
    ticker,
    analysisType: 'gemini',
    reportId: data?.reportId,
    report: data?.report
  };
};

export const getJobById = async (jobId: string): Promise<JobDetail> => {
  const { data } = await apiJson<JobDetail>(`/api/jobs/${jobId}`);
  return data;
};
