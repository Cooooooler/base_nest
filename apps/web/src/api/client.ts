import { useAuthStore } from '@/store/auth-store';
import type { ApiResponse } from '@base/shared';
import ky from 'ky';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return useAuthStore.getState().accessToken;
  } catch {
    return null;
  }
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return useAuthStore.getState().refreshToken;
  } catch {
    return null;
  }
}

function setTokens(access: string, refresh: string) {
  useAuthStore.getState().setTokens(access, refresh);
}

function clearTokens() {
  useAuthStore.getState().reset();
}

const client = ky.create({
  prefix: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  hooks: {
    beforeRequest: [
      ({ request }) => {
        const token = getAccessToken();
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async ({ request, response }) => {
        if (response.status !== 401) return;

        const refreshToken = getRefreshToken();
        if (!refreshToken) {
          clearTokens();
          return;
        }

        try {
          const refreshRes = await ky
            .post(`${API_BASE}/auth/refresh`, {
              json: { refreshToken },
            })
            .json<ApiResponse<{ accessToken: string; refreshToken: string }>>();

          if (refreshRes.code === 1 && refreshRes.data) {
            setTokens(refreshRes.data.accessToken, refreshRes.data.refreshToken);
            const headers = new Headers(request.headers);
            headers.set('Authorization', `Bearer ${refreshRes.data.accessToken}`);
            return ky.retry({ request: new Request(request, { headers }) });
          }
        } catch {
          // refresh failed
        }

        clearTokens();
      },
    ],
  },
});

type KyOptions = Parameters<typeof ky.get>[1] & { json?: unknown };

export async function apiClient<T>(path: string, options: KyOptions = {}): Promise<T> {
  const response = await client(path, options);
  const data: ApiResponse<T> = await response.json();

  if (data.code !== 1) {
    throw new ApiError(response.status, data.code, data.msg || 'Request failed');
  }

  return data.data as T;
}

async function retryWithRefresh(
  path: string,
  headers: Record<string, string>,
  formData: FormData
): Promise<{ data: ApiResponse<unknown>; status: number } | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const refreshRes = await ky
      .post(`${API_BASE}/auth/refresh`, { json: { refreshToken } })
      .json<ApiResponse<{ accessToken: string; refreshToken: string }>>();

    if (refreshRes.code !== 1 || !refreshRes.data) return null;

    setTokens(refreshRes.data.accessToken, refreshRes.data.refreshToken);
    headers['Authorization'] = `Bearer ${refreshRes.data.accessToken}`;
    const retryRes = await ky.post(`${API_BASE}${path}`, { body: formData, headers });
    const retryData: ApiResponse<unknown> = await retryRes.json();
    return { data: retryData, status: retryRes.status };
  } catch {
    return null;
  }
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
    const retried = await retryWithRefresh(path, headers, formData);
    if (retried) {
      if (retried.data.code !== 1)
        throw new ApiError(retried.status, retried.data.code, retried.data.msg || 'Upload failed');
      return retried.data.data as T;
    }
    clearTokens();
  }

  const data: ApiResponse<T> = await response.json();
  if (data.code !== 1) throw new ApiError(response.status, data.code, data.msg || 'Upload failed');
  return data.data as T;
}
