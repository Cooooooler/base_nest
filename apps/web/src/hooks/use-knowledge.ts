import {
  createKnowledgeBase,
  deleteDocument,
  deleteKnowledgeBase,
  getDocument,
  getDocumentSegments,
  getDocuments,
  getKnowledgeBase,
  getKnowledgeBases,
  retrieve,
} from '@/api/knowledge';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useKnowledgeBases() {
  return useQuery({
    queryKey: ['knowledge-bases'],
    queryFn: getKnowledgeBases,
  });
}

export function useKnowledgeBase(id: string) {
  return useQuery({
    queryKey: ['knowledge-bases', id],
    queryFn: () => getKnowledgeBase(id),
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
    }) => createKnowledgeBase(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['knowledge-bases'] }),
  });
}

export function useDeleteKnowledgeBase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteKnowledgeBase(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['knowledge-bases'] }),
  });
}

export function useDocuments(knowledgeBaseId: string) {
  return useQuery({
    queryKey: ['knowledge-bases', knowledgeBaseId, 'documents'],
    queryFn: () => getDocuments(knowledgeBaseId),
    enabled: !!knowledgeBaseId,
  });
}

export function useDocument(knowledgeBaseId: string, documentId: string) {
  return useQuery({
    queryKey: ['documents', documentId],
    queryFn: () => getDocument(knowledgeBaseId, documentId),
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
    }) => deleteDocument(knowledgeBaseId, documentId),
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({
        queryKey: ['knowledge-bases', variables.knowledgeBaseId, 'documents'],
      }),
  });
}

export function useDocumentSegments(knowledgeBaseId: string, documentId: string) {
  return useQuery({
    queryKey: ['documents', documentId, 'segments'],
    queryFn: () => getDocumentSegments(knowledgeBaseId, documentId),
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
    }) => retrieve(knowledgeBaseId, query, topK),
  });
}
