import ky from 'ky';
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

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('auth-storage');
    if (!stored) return null;
    return JSON.parse(stored).state?.accessToken ?? null;
  } catch {
    return null;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
const client = ky.create({
  prefix: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  hooks: {
    beforeRequest: [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (request: any) => {
        const token = getAccessToken();
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async (response: any) => {
        if (response.status === 401) {
          const refreshToken = getRefreshToken();
          if (refreshToken) {
            try {
              const refreshRes = await ky.post(`${API_BASE}/auth/refresh`, {
                json: { refreshToken },
              }).json<ApiResponse<{ accessToken: string; refreshToken: string }>>();

              if (refreshRes.code === 1 && refreshRes.data) {
                setTokens(refreshRes.data.accessToken, refreshRes.data.refreshToken);
              } else {
                clearTokens();
              }
            } catch {
              clearTokens();
            }
          }
        }
      },
    ],
  },
  retry: {
    limit: 2,
    methods: ['get', 'put', 'patch', 'delete', 'post'],
    statusCodes: [401],
  },
});

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('auth-storage');
    if (!stored) return null;
    return JSON.parse(stored).state?.refreshToken ?? null;
  } catch {
    return null;
  }
}

type KyOptions = Parameters<typeof ky.get>[1] & { json?: unknown };

async function request<T>(path: string, options: KyOptions = {}): Promise<T> {
  const response = await client(path, options);
  const data: ApiResponse<T> = await response.json();

  if (data.code !== 1) {
    throw new ApiError(response.status, data.code, data.msg || 'Request failed');
  }

  return data.data as T;
}

export function apiClient<T>(path: string, options: KyOptions = {}): Promise<T> {
  return request<T>(path, options);
}

export async function apiUpload<T>(path: string, file: File): Promise<T> {
  const formData = new FormData();
  formData.append('file', file);

  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await ky.post(`${API_BASE}${path}`, {
    body: formData,
    headers,
  });

  if (response.status === 401) {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      const refreshRes = await ky.post(`${API_BASE}/auth/refresh`, {
        json: { refreshToken },
      }).json<ApiResponse<{ accessToken: string; refreshToken: string }>>();

      if (refreshRes.code === 1 && refreshRes.data) {
        setTokens(refreshRes.data.accessToken, refreshRes.data.refreshToken);
        headers['Authorization'] = `Bearer ${refreshRes.data.accessToken}`;
        const retryRes = await ky.post(`${API_BASE}${path}`, { body: formData, headers });
        const retryData: ApiResponse<T> = await retryRes.json();
        if (retryData.code !== 1) throw new ApiError(retryRes.status, retryData.code, retryData.msg || 'Upload failed');
        return retryData.data as T;
      }
    }
    clearTokens();
  }

  const data: ApiResponse<T> = await response.json();
  if (data.code !== 1) throw new ApiError(response.status, data.code, data.msg || 'Upload failed');
  return data.data as T;
}
