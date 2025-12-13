import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

const BASE_URL = 'https://finnhub.io/api/v1';

type QueryParams = Record<string, string | number | undefined | null>;

const buildUrl = (path: string, params: QueryParams = {}) => {
  const url = new URL(`${BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, String(value));
  });
  url.searchParams.set('token', config.finnhubApiKey);
  return url.toString();
};

const fetchJson = async <T>(path: string, params?: QueryParams): Promise<T> => {
  if (!config.finnhubApiKey) {
    throw new Error('FINNHUB_API_KEY is not configured');
  }

  const url = buildUrl(path, params);
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`Finnhub request failed: ${res.status} ${res.statusText}`);
    logger.warn({ message: 'finnhub.request.failed', path, status: res.status, statusText: res.statusText, body: text });
    throw err;
  }

  const data = await res.json() as T;
  return data;
};

export interface FinnhubQuote {
  c: number; // current price
  d: number; // change
  dp: number; // percent change
  h: number; // high of day
  l: number; // low of day
  o: number; // open price
  pc: number; // previous close
}

export interface FinnhubProfile {
  ticker?: string;
  name?: string;
  currency?: string;
  exchange?: string;
  finnhubIndustry?: string;
  ipo?: string;
  marketCapitalization?: number;
  shareOutstanding?: number;
  country?: string;
  weburl?: string;
  logo?: string;
  beta?: number;
}

export interface FinnhubMetricResponse {
  metric?: Record<string, unknown>;
  metricType?: string;
  series?: unknown;
}

export interface FinnhubFinancialsReported {
  data: Array<{
    symbol: string;
    year: number;
    quarter?: number;
    form?: string;
    startDate?: string;
    endDate?: string;
    filedDate?: string;
    acceptedDate?: string;
    report: {
      ic?: { [key: string]: number | string | null };
      bs?: { [key: string]: number | string | null };
      cf?: { [key: string]: number | string | null };
    };
  }>;
}

export interface FinnhubEarningsSurprise {
  symbol?: string;
  period?: string;
  actual?: number;
  estimate?: number;
  surprise?: number;
  surprisePercent?: number;
}

export const getQuote = (symbol: string) =>
  fetchJson<FinnhubQuote>('/quote', { symbol });

export const getProfile = (symbol: string) =>
  fetchJson<FinnhubProfile>('/stock/profile2', { symbol });

export const getPeers = (symbol: string) =>
  fetchJson<string[]>('/stock/peers', { symbol });

export const getBasicFinancials = (symbol: string) =>
  fetchJson<FinnhubMetricResponse>('/stock/metric', { symbol, metric: 'all' });

export const getFinancialsReported = (symbol: string, freq: 'annual' | 'quarterly' = 'annual') =>
  fetchJson<FinnhubFinancialsReported>('/stock/financials-reported', { symbol, freq });

export const getExchangeRate = (from: string, to: string) =>
  fetchJson<{ quote: number }>('/forex/rates', { base: from, symbols: to });

export const getEarningsSurprises = (symbol: string) =>
  fetchJson<FinnhubEarningsSurprise[]>('/stock/earnings', { symbol });
