import { apiJson } from './apiClient';
import type { EquityReport } from '../types';

export const saveReport = async (report: EquityReport) => {
  if (!report?.ticker || !report?.companyName) {
    const err: any = new Error('Cannot save incomplete report payload');
    err.status = 400;
    throw err;
  }

  const encoded = typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(JSON.stringify(report)) : [];
  const payloadSize = encoded?.length || 0;

  const body = {
    title: report.companyName || report.ticker,
    ticker: report.ticker,
    status: 'complete',
    type: 'equity',
    payload: report
  };

  console.info('reports.save.request', {
    ticker: report.ticker,
    sizeBytes: payloadSize,
    hasSummary: !!report.summary,
    hasReportDate: !!report.reportDate
  });

  const { data } = await apiJson<{ reportId: string }>('/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }, { operation: 'reports.save' });

  return data.reportId;
};
