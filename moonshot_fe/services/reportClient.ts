import { apiJson } from './apiClient';
import type { EquityReport } from '../types';

export interface ReportResponse {
  report: {
    id: string;
    payload: EquityReport;
  };
}

export const fetchReportById = async (id: string) => {
  const { data } = await apiJson<ReportResponse>(`/api/reports/${id}`, {
    method: 'GET'
  }, { operation: 'reports.fetch' });
  return data.report;
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

export const listReports = async (page = 1, pageSize = 10) => {
  const { data } = await apiJson<ReportListResponse>(`/api/reports?page=${page}&pageSize=${pageSize}`, {
    method: 'GET'
  }, { operation: 'reports.list' });
  return data;
};

export const deleteReport = async (id: string) => {
  await apiJson<void>(`/api/reports/${id}`, { method: 'DELETE' }, { operation: 'reports.delete' });
};
