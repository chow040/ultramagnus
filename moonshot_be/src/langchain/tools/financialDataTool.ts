import { getFinancialsReported } from '../../clients/finnhub.js';
import { logger } from '../../utils/logger.js';

export interface QuarterFinancial {
  symbol: string;
  year: number;
  quarter?: number;
  form?: string;
  startDate?: string;
  endDate?: string;
  filedDate?: string;
  acceptedDate?: string;
  /**
   * Statement-level period semantics
   * - income/cash flow in 10-Q: YTD
   * - income/cash flow in 10-K: ANNUAL
   * - balance sheet: POINT_IN_TIME
   */
  periodTypeIncome?: 'YTD' | 'ANNUAL';
  periodTypeCashFlow?: 'YTD' | 'ANNUAL';
  periodTypeBalanceSheet?: 'POINT_IN_TIME';
  incomeStatement?: Record<string, number | string | null>;
  balanceSheet?: Record<string, number | string | null>;
  cashFlow?: Record<string, number | string | null>;
}

/**
 * Fetches the most recent quarterly financials (default: last 4 quarters) from Finnhub.
 * Returns structured statements for each quarter to feed into LangChain tools/chains.
 */
export async function fetchRecentQuarterFinancials(
  ticker: string,
  periods = 4
): Promise<QuarterFinancial[]> {
  if (!ticker || typeof ticker !== 'string') {
    throw new Error('Ticker symbol is required');
  }

  try {
    const response = await getFinancialsReported(ticker, 'quarterly');
    const rows = response?.data ?? [];
    const recent = rows.slice(0, periods);

    return recent.map((entry) => ({
      symbol: entry.symbol,
      year: entry.year,
      quarter: entry.quarter,
      form: entry.form,
      startDate: entry.startDate,
      endDate: entry.endDate,
      filedDate: entry.filedDate,
      acceptedDate: entry.acceptedDate,
      periodTypeIncome: entry.form === '10-K' ? 'ANNUAL' : 'YTD',
      periodTypeCashFlow: entry.form === '10-K' ? 'ANNUAL' : 'YTD',
      periodTypeBalanceSheet: 'POINT_IN_TIME',
      incomeStatement: entry.report?.ic,
      balanceSheet: entry.report?.bs,
      cashFlow: entry.report?.cf
    }));
  } catch (err) {
    logger.error({ message: 'finnhub.financials.fetch_failed', ticker, err });
    throw err;
  }
}
