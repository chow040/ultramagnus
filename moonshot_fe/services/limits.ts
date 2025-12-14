import { apiJson } from './apiClient';

export const checkGuestLimit = async () => {
  try {
    const { data } = await apiJson<{ ok: boolean; remaining: number }>('/api/limits/search', {
      method: 'POST'
    });
    return data;
  } catch (err: any) {
    if (err?.status === 429) {
      return { ok: false, remaining: 0 };
    }
    throw err;
  }
};
