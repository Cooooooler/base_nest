import { apiClient } from '@/lib/api-client';
import type { CreateApiKeyDto, CreateProviderDto, ModelProvider } from '@base/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useProviders() {
  return useQuery({
    queryKey: ['providers'],
    queryFn: () => apiClient<ModelProvider[]>('/providers'),
  });
}

export function useProvider(id: string) {
  return useQuery({
    queryKey: ['providers', id],
    queryFn: () => apiClient<ModelProvider>(`/providers/${id}`),
    enabled: !!id,
  });
}

export function useCreateProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateProviderDto) =>
      apiClient<ModelProvider>('/providers', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['providers'] }),
  });
}

export function useDeleteProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient<void>(`/providers/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['providers'] }),
  });
}

export function useProviderApiKeys(providerId: string) {
  return useQuery({
    queryKey: ['providers', providerId, 'keys'],
    queryFn: () =>
      apiClient<
        { id: string; name: string; maskedKey: string; isActive: boolean; createdAt: string }[]
      >(`/providers/${providerId}/keys`),
    enabled: !!providerId,
  });
}

export function useCreateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ providerId, ...dto }: CreateApiKeyDto & { providerId: string }) =>
      apiClient<{ id: string; maskedKey: string }>(`/providers/${providerId}/keys`, {
        method: 'POST',
        body: JSON.stringify(dto),
      }),
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: ['providers', variables.providerId, 'keys'] }),
  });
}

export function useDeleteApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) =>
      apiClient<void>(`/providers/keys/${keyId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['providers'] }),
  });
}
