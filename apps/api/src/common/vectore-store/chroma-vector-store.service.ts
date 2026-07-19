import { Chroma } from '@langchain/community/vectorstores/chroma';
import { Embeddings } from '@langchain/core/embeddings';
import { Injectable } from '@nestjs/common';
import type { Where } from 'chromadb';

@Injectable()
export class ChromaVectorStoreService {
  private readonly defaultStore: Chroma;

  constructor(
    private readonly defaultEmbeddings: Embeddings,
    config: { collectionName: string; url?: string; numDimensions?: number }
  ) {
    this.defaultStore = new Chroma(defaultEmbeddings, {
      collectionName: config.collectionName,
      url: config.url || 'http://localhost:8000',
      numDimensions: config.numDimensions ?? 1024,
    });
  }

  private storeFor(embeddings?: Embeddings): Chroma {
    if (!embeddings || embeddings === this.defaultEmbeddings) {
      return this.defaultStore;
    }
    // When a custom embeddings is provided, create an ephemeral store
    return new Chroma(embeddings, {
      collectionName: this.defaultStore.collectionName,
      url: this.defaultStore.url || 'http://localhost:8000',
      numDimensions: this.defaultStore.numDimensions ?? 1024,
    });
  }

  async addDocuments(
    docs: { pageContent: string; metadata?: Record<string, any> }[],
    embeddings?: Embeddings
  ): Promise<string[]> {
    const store = this.storeFor(embeddings);
    return await store.addDocuments(
      docs.map((d) => ({
        pageContent: d.pageContent,
        metadata: d.metadata ?? {},
      }))
    );
  }

  async similaritySearch(query: string, k: number = 4, embeddings?: Embeddings) {
    const store = this.storeFor(embeddings);
    return await store.similaritySearch(query, k);
  }

  async similaritySearchWithScore(query: string, k: number = 4, embeddings?: Embeddings) {
    const store = this.storeFor(embeddings);
    return await store.similaritySearchWithScore(query, k);
  }

  async deleteDocuments(ids: string[]): Promise<void> {
    await this.defaultStore.delete({ ids });
  }

  /**
   * Delete vectors matching a metadata filter.
   * Uses the underlying ChromaDB collection's native filter delete.
   */
  async deleteByFilter(filter: Where): Promise<void> {
    if (this.defaultStore.collection) {
      await this.defaultStore.collection.delete({ where: filter });
    }
  }

  getCollectionName(): string {
    return this.defaultStore.collectionName;
  }
}
