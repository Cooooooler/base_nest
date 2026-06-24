import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmbeddingFactory } from '../common/embeddings/embedding-factory.service';
import { ChromaVectorStoreService } from '../common/vectore-store/chroma-vector-store.service';
import { KnowledgeBase } from './entities/knowledge-base.entity';

@Injectable()
export class RetrievalService {
  constructor(
    private readonly vectorStore: ChromaVectorStoreService,
    private readonly embeddingFactory: EmbeddingFactory,
    @InjectRepository(KnowledgeBase)
    private readonly kbRepo: Repository<KnowledgeBase>
  ) {}

  async search(knowledgeBaseId: string, query: string, topK: number = 4) {
    const kb = await this.kbRepo.findOneBy({ id: knowledgeBaseId });
    const embeddings = this.embeddingFactory.create(kb?.embeddingModel ?? 'mxbai-embed-large');
    const results = await this.vectorStore.similaritySearch(query, topK, embeddings);

    return results.map((doc) => ({
      content: doc.pageContent,
      metadata: doc.metadata,
      score: undefined,
    }));
  }

  async searchWithScore(knowledgeBaseId: string, query: string, topK: number = 4) {
    const kb = await this.kbRepo.findOneBy({ id: knowledgeBaseId });
    const embeddings = this.embeddingFactory.create(kb?.embeddingModel ?? 'mxbai-embed-large');
    const results = await this.vectorStore.similaritySearchWithScore(query, topK, embeddings);
    return results.map(([doc, score]) => ({
      content: doc.pageContent,
      metadata: doc.metadata,
      score: 1 - score,
    }));
  }
}
