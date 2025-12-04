const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export const checkGuestLimit = async () => {
  const res = await fetch(`${API_BASE}/limits/search`, {
    method: 'POST',
    credentials: 'include'
  });

  if (res.status === 429) {
    return { ok: false, remaining: 0 };
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Limit check failed');
  }

  return data as { ok: boolean; remaining: number };
};
