import { Chroma } from '@langchain/community/vectorstores/chroma';
import { Embeddings } from '@langchain/core/embeddings';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ChromaVectorStoreService {
  private store: Chroma;

  constructor(
    private readonly embeddings: Embeddings,
    config: { collectionName: string; url?: string; numDimensions?: number }
  ) {
    this.store = new Chroma(embeddings, {
      collectionName: config.collectionName,
      url: config.url || 'http://localhost:8000',
      numDimensions: config.numDimensions ?? 1024,
    });
  }

  async addDocuments(
    docs: { pageContent: string; metadata?: Record<string, any> }[]
  ): Promise<string[]> {
    return this.store.addDocuments(
      docs.map((d) => ({
        pageContent: d.pageContent,
        metadata: d.metadata ?? {},
      }))
    );
  }

  async similaritySearch(query: string, k: number = 4) {
    return this.store.similaritySearch(query, k);
  }

  async similaritySearchWithScore(query: string, k: number = 4) {
    return this.store.similaritySearchWithScore(query, k);
  }

  async deleteDocuments(ids: string[]): Promise<void> {
    await this.store.delete({ ids });
  }

  getCollectionName(): string {
    return this.store.collectionName;
  }
}
