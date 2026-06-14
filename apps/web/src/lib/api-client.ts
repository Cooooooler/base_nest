import type { ApiResponse } from '@base/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

class ApiError extends Error {
  constructor(
    public status: number,
    public code: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getTokens(): { access: string | null; refresh: string | null } {
  if (typeof window === 'undefined') return { access: null, refresh: null };
  try {
    const stored = localStorage.getItem('auth-storage');
    if (!stored) return { access: null, refresh: null };
    const state = JSON.parse(stored);
    return {
      access: state.state?.accessToken ?? null,
      refresh: state.state?.refreshToken ?? null,
    };
  } catch {
    return { access: null, refresh: null };
  }
}

function setTokens(access: string, refresh: string) {
  try {
    const stored = localStorage.getItem('auth-storage');
    if (!stored) return;
    const state = JSON.parse(stored);
    state.state.accessToken = access;
    state.state.refreshToken = refresh;
    localStorage.setItem('auth-storage', JSON.stringify(state));
  } catch {
    // ignore
  }
}

function clearTokens() {
  try {
    const stored = localStorage.getItem('auth-storage');
    if (!stored) return;
    const state = JSON.parse(stored);
    state.state.accessToken = null;
    state.state.refreshToken = null;
    state.state.user = null;
    localStorage.setItem('auth-storage', JSON.stringify(state));
  } catch {
    // ignore
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const { refresh } = getTokens();
  if (!refresh) return null;

  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refresh }),
  });

  if (!res.ok) {
    clearTokens();
    return null;
  }

  const data: ApiResponse<{ accessToken: string; refreshToken: string }> = await res.json();
  if (data.code === 1 && data.data) {
    setTokens(data.data.accessToken, data.data.refreshToken);
    return data.data.accessToken;
  }
  return null;
}

export async function apiClient<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { access } = getTokens();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (access) {
    headers['Authorization'] = `Bearer ${access}`;
  }

  let res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // If 401, try refresh
  if (res.status === 401 && access) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    }
  }

  const data: ApiResponse<T> = await res.json();

  if (data.code !== 1 || !res.ok) {
    throw new ApiError(res.status, data.code, data.msg || 'Request failed');
  }

  return data.data as T;
}

export async function apiUpload<T>(path: string, file: File): Promise<T> {
  const { access } = getTokens();
  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {};
  if (access) {
    headers['Authorization'] = `Bearer ${access}`;
  }

  let res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (res.status === 401 && access) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers,
        body: formData,
      });
    }
  }

  const data: ApiResponse<T> = await res.json();
  if (data.code !== 1 || !res.ok) {
    throw new ApiError(res.status, data.code, data.msg || 'Upload failed');
  }
  return data.data as T;
}
