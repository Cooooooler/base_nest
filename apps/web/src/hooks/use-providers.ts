import {
  createApiKey,
  createProvider,
  deleteApiKey,
  deleteProvider,
  getProvider,
  getProviderApiKeys,
  getProviders,
} from '@/api/providers';
import type { CreateApiKeyDto, CreateProviderDto } from '@base/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useProviders() {
  return useQuery({
    queryKey: ['providers'],
    queryFn: getProviders,
  });
}

export function useProvider(id: string) {
  return useQuery({
    queryKey: ['providers', id],
    queryFn: () => getProvider(id),
    enabled: !!id,
  });
}

export function useCreateProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateProviderDto) => createProvider(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['providers'] }),
  });
}

export function useDeleteProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProvider(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['providers'] }),
  });
}

export function useProviderApiKeys(providerId: string) {
  return useQuery({
    queryKey: ['providers', providerId, 'keys'],
    queryFn: () => getProviderApiKeys(providerId),
    enabled: !!providerId,
  });
}

export function useCreateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ providerId, ...dto }: CreateApiKeyDto & { providerId: string }) =>
      createApiKey(providerId, dto),
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: ['providers', variables.providerId, 'keys'] }),
  });
}

export function useDeleteApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => deleteApiKey(keyId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['providers'] }),
  });
}
