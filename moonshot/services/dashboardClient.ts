import { apiJson } from './apiClient';
import { DashboardView, DashboardError } from '../types';

export interface DashboardResponse {
  dashboard: DashboardView;
  errors?: DashboardError[];
}

export interface DashboardParams {
  reportsPage?: number;
  reportsPageSize?: number;
  bookmarksPage?: number;
  bookmarksPageSize?: number;
  activityLimit?: number;
}

export const fetchDashboard = async (params: DashboardParams = {}): Promise<DashboardResponse> => {
  const search = new URLSearchParams();
  if (params.reportsPage) search.set('reportsPage', String(params.reportsPage));
  if (params.reportsPageSize) search.set('reportsPageSize', String(params.reportsPageSize));
  if (params.bookmarksPage) search.set('bookmarksPage', String(params.bookmarksPage));
  if (params.bookmarksPageSize) search.set('bookmarksPageSize', String(params.bookmarksPageSize));
  if (params.activityLimit) search.set('activityLimit', String(params.activityLimit));

  const path = `/api/dashboard${search.toString() ? `?${search.toString()}` : ''}`;

  const { data } = await apiJson<DashboardResponse>(path, {
    method: 'GET'
  }, { operation: 'dashboard.fetch' });

  return data;
};
