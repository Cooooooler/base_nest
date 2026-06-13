export interface KnowledgeBase {
  id: string;
  name: string;
  description: string | null;
  embeddingModel: string;
  chunkStrategy: string;
  chunkSize: number;
  chunkOverlap: number;
  documents: Document[];
  createdAt: string;
}

export interface Document {
  id: string;
  knowledgeBaseId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage: string | null;
  charCount: number;
  tokenCount: number | null;
  processedAt: string | null;
  createdAt: string;
}

export interface DocumentSegment {
  id: string;
  documentId: string;
  knowledgeBaseId: string;
  index: number;
  content: string;
  charCount: number;
  tokenCount: number | null;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface RetrievalResult {
  content: string;
  metadata: Record<string, any>;
  score?: number;
}
