const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export const verifyEmail = async (token: string) => {
  const res = await fetch(`${API_BASE}/api/auth/verify?token=${encodeURIComponent(token)}`, {
    method: 'GET',
    credentials: 'include'
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Verification failed');
  }
  return data;
};
