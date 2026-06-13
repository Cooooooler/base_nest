import { Injectable } from '@nestjs/common';
import { ChromaVectorStoreService } from '../common/vectore-store/chroma-vector-store.service';

@Injectable()
export class RetrievalService {
  constructor(private readonly vectorStore: ChromaVectorStoreService) {}

  async search(knowledgeBaseId: string, query: string, topK: number = 4) {
    const results = await this.vectorStore.similaritySearch(query, topK);

    return results.map((doc) => ({
      content: doc.pageContent,
      metadata: doc.metadata,
      score: undefined,
    }));
  }

  async searchWithScore(knowledgeBaseId: string, query: string, topK: number = 4) {
    const results = await this.vectorStore.similaritySearchWithScore(query, topK);
    return results.map(([doc, score]) => ({
      content: doc.pageContent,
      metadata: doc.metadata,
      score: 1 - score,
    }));
  }
}
