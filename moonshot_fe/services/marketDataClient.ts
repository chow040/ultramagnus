import { apiJson } from './apiClient';

export interface MarketDataResponse {
  financials?: {
    data?: any[];
  };
  metrics?: {
    metric?: Record<string, any>;
    metricType?: string;
    series?: any;
    symbol?: string;
  };
}

export const fetchMarketData = async (symbol: string, freq: 'annual' | 'quarterly' = 'quarterly') => {
  const { data } = await apiJson<MarketDataResponse>(`/api/marketdata/${symbol}?freq=${freq}`, {
    method: 'GET'
  }, { operation: 'marketdata.fetch' });
  return data;
};
