import type { CreateApiKeyDto, CreateProviderDto, Model, ModelProvider } from '@base/shared';
import { apiClient } from './client';

export function getProviders() {
  return apiClient<ModelProvider[]>('/providers');
}

export function getProvider(id: string) {
  return apiClient<ModelProvider>(`/providers/${id}`);
}

export function createProvider(dto: CreateProviderDto) {
  return apiClient<ModelProvider>('/providers', {
    method: 'POST',
    json: dto,
  });
}

export function deleteProvider(id: string) {
  return apiClient<void>(`/providers/${id}`, { method: 'DELETE' });
}

export function getProviderApiKeys(providerId: string) {
  return apiClient<
    { id: string; name: string; maskedKey: string; isActive: boolean; createdAt: string }[]
  >(`/providers/${providerId}/keys`);
}

export function createApiKey(providerId: string, dto: CreateApiKeyDto) {
  return apiClient<{ id: string; maskedKey: string }>(`/providers/${providerId}/keys`, {
    method: 'POST',
    json: dto,
  });
}

export function deleteApiKey(keyId: string) {
  return apiClient<void>(`/providers/keys/${keyId}`, { method: 'DELETE' });
}

export function getProviderModels(providerId: string) {
  return apiClient<Model[]>(`/providers/${providerId}/models`);
}
