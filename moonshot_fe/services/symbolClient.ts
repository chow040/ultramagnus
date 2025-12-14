import { apiJson } from './apiClient';

export interface SymbolSuggestion {
  symbol: string;
  name: string;
  type: string;
}

export const searchSymbols = async (query: string) => {
  const params = new URLSearchParams();
  params.set('q', query);
  const { data } = await apiJson<{ suggestions: SymbolSuggestion[] }>(`/api/symbols/search?${params.toString()}`, {
    method: 'GET'
  }, { operation: 'symbols.search' });
  return data.suggestions || [];
};
