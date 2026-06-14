import { apiClient } from '@/lib/api-client';
import type { Document, DocumentSegment, KnowledgeBase, RetrievalResult } from '@base/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useKnowledgeBases() {
  return useQuery({
    queryKey: ['knowledge-bases'],
    queryFn: () => apiClient<KnowledgeBase[]>('/knowledge'),
  });
}

export function useKnowledgeBase(id: string) {
  return useQuery({
    queryKey: ['knowledge-bases', id],
    queryFn: () => apiClient<KnowledgeBase>(`/knowledge/${id}`),
    enabled: !!id,
  });
}

export function useCreateKnowledgeBase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: {
      name: string;
      description?: string;
      chunkSize?: number;
      chunkOverlap?: number;
    }) =>
      apiClient<KnowledgeBase>('/knowledge', {
        method: 'POST',
        json: dto,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['knowledge-bases'] }),
  });
}

export function useDeleteKnowledgeBase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient<void>(`/knowledge/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['knowledge-bases'] }),
  });
}

export function useDocuments(knowledgeBaseId: string) {
  return useQuery({
    queryKey: ['knowledge-bases', knowledgeBaseId, 'documents'],
    queryFn: () => apiClient<Document[]>(`/knowledge/${knowledgeBaseId}/documents`),
    enabled: !!knowledgeBaseId,
  });
}

export function useDocument(knowledgeBaseId: string, documentId: string) {
  return useQuery({
    queryKey: ['documents', documentId],
    queryFn: () => apiClient<Document>(`/knowledge/${knowledgeBaseId}/documents/${documentId}`),
    enabled: !!knowledgeBaseId && !!documentId,
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      knowledgeBaseId,
      documentId,
    }: {
      knowledgeBaseId: string;
      documentId: string;
    }) =>
      apiClient<void>(`/knowledge/${knowledgeBaseId}/documents/${documentId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({
        queryKey: ['knowledge-bases', variables.knowledgeBaseId, 'documents'],
      }),
  });
}

export function useDocumentSegments(knowledgeBaseId: string, documentId: string) {
  return useQuery({
    queryKey: ['documents', documentId, 'segments'],
    queryFn: () =>
      apiClient<DocumentSegment[]>(
        `/knowledge/${knowledgeBaseId}/documents/${documentId}/segments`
      ),
    enabled: !!knowledgeBaseId && !!documentId,
  });
}

export function useRetrieval() {
  return useMutation({
    mutationFn: ({
      knowledgeBaseId,
      query,
      topK,
    }: {
      knowledgeBaseId: string;
      query: string;
      topK?: number;
    }) =>
      apiClient<RetrievalResult[]>(`/knowledge/${knowledgeBaseId}/retrieval`, {
        method: 'POST',
        json: { query, topK },
      }),
  });
}
