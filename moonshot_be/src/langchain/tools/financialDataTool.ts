import { getFinancialsReported } from '../../clients/finnhub.js';
import { logger } from '../../utils/logger.js';

export interface QuarterFinancial {
  symbol: string;
  year: number;
  quarter?: number;
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
      incomeStatement: entry.report?.ic,
      balanceSheet: entry.report?.bs,
      cashFlow: entry.report?.cf
    }));
  } catch (err) {
    logger.error({ message: 'finnhub.financials.fetch_failed', ticker, err });
    throw err;
  }
}

