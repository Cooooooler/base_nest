import type { Document, DocumentSegment, KnowledgeBase, RetrievalResult } from '@base/shared';
import { apiClient } from './client';

export function getKnowledgeBases() {
  return apiClient<KnowledgeBase[]>('/knowledge');
}

export function getKnowledgeBase(id: string) {
  return apiClient<KnowledgeBase>(`/knowledge/${id}`);
}

export function createKnowledgeBase(dto: {
  name: string;
  description?: string;
  embeddingModel?: string;
  chunkSize?: number;
  chunkOverlap?: number;
}) {
  return apiClient<KnowledgeBase>('/knowledge', {
    method: 'POST',
    json: dto,
  });
}

export function deleteKnowledgeBase(id: string) {
  return apiClient<void>(`/knowledge/${id}`, { method: 'DELETE' });
}

export function getDocuments(knowledgeBaseId: string) {
  return apiClient<Document[]>(`/knowledge/${knowledgeBaseId}/documents`);
}

export function getDocument(knowledgeBaseId: string, documentId: string) {
  return apiClient<Document>(`/knowledge/${knowledgeBaseId}/documents/${documentId}`);
}

export function deleteDocument(knowledgeBaseId: string, documentId: string) {
  return apiClient<void>(`/knowledge/${knowledgeBaseId}/documents/${documentId}`, {
    method: 'DELETE',
  });
}

export function getDocumentSegments(knowledgeBaseId: string, documentId: string) {
  return apiClient<DocumentSegment[]>(
    `/knowledge/${knowledgeBaseId}/documents/${documentId}/segments`
  );
}

export function retrieve(knowledgeBaseId: string, query: string, topK?: number) {
  return apiClient<RetrievalResult[]>(`/knowledge/${knowledgeBaseId}/retrieval`, {
    method: 'POST',
    json: { query, topK },
  });
}
