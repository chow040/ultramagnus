import { apiJson } from './apiClient';
import type { EquityReport } from '../types';

export interface ReportResponse {
  report: {
    id: string;
    payload: EquityReport;
  };
}

/**
 * Fetch a report and return its payload with id included for convenience.
 */
export const fetchReportById = async (id: string) => {
  const { data } = await apiJson<ReportResponse>(`/api/reports/${id}`, {
    method: 'GET'
  }, { operation: 'reports.fetch' });

  if (!data?.report?.payload) {
    throw new Error('Report payload missing');
  }

  return { ...data.report.payload, id: data.report.id } as EquityReport & { id: string };
};

export interface ReportListResponse {
  items: {
    id: string;
    title: string;
    ticker?: string;
    status: string;
    type: string;
    ownerId: string;
    createdAt: string;
    updatedAt: string;
  }[];
  page: number;
  pageSize: number;
  total: number;
}

export const listReports = async (page = 1, pageSize = 10, query?: string) => {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  if (query) params.set('q', query);
  const { data } = await apiJson<ReportListResponse>(`/api/reports?${params.toString()}`, {
    method: 'GET'
  }, { operation: 'reports.list' });
  return data;
};

export const deleteReport = async (id: string) => {
  await apiJson<void>(`/api/reports/${id}`, { method: 'DELETE' }, { operation: 'reports.delete' });
};
