import {
  createApp,
  createConversation,
  deleteApp,
  deleteConversation,
  getApp,
  getApps,
  getConversations,
  getMessages,
  updateApp,
} from '@/api/chat';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ---- Apps ----
export function useApps() {
  return useQuery({
    queryKey: ['apps'],
    queryFn: getApps,
  });
}

export function useApp(id: string) {
  return useQuery({
    queryKey: ['apps', id],
    queryFn: () => getApp(id),
    enabled: !!id,
  });
}

export function useCreateApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Parameters<typeof createApp>[0]) => createApp(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['apps'] }),
  });
}

export function useUpdateApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...dto
    }: { id: string } & Partial<{
      name: string;
      description: string;
      systemPrompt: string;
      temperature: number;
      maxTokens: number;
    }>) => updateApp(id, dto),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['apps'] });
      qc.invalidateQueries({ queryKey: ['apps', variables.id] });
    },
  });
}

export function useDeleteApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteApp(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['apps'] }),
  });
}

// ---- Conversations ----
export function useConversations(appId: string) {
  return useQuery({
    queryKey: ['apps', appId, 'conversations'],
    queryFn: () => getConversations(appId),
    enabled: !!appId,
  });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ appId, title }: { appId: string; title?: string }) =>
      createConversation(appId, title),
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: ['apps', variables.appId, 'conversations'] }),
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ appId, convId }: { appId: string; convId: string }) =>
      deleteConversation(appId, convId),
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: ['apps', variables.appId, 'conversations'] }),
  });
}

// ---- Messages ----
export function useMessages(appId: string, convId: string) {
  return useQuery({
    queryKey: ['apps', appId, 'conversations', convId, 'messages'],
    queryFn: () => getMessages(appId, convId),
    enabled: !!appId && !!convId,
  });
}
