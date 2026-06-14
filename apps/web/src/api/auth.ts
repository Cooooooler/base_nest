import type { LoginResponse, RegisterResponse } from '@base/shared';
import { apiClient } from './client';

export function login(email: string, password: string) {
  return apiClient<LoginResponse>('/auth/login', {
    method: 'POST',
    json: { email, password },
  });
}

export function register(email: string, name: string, password: string) {
  return apiClient<RegisterResponse>('/auth/register', {
    method: 'POST',
    json: { email, name, password },
  });
}
