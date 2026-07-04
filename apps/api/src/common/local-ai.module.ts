import { OllamaEmbeddings } from '@langchain/ollama';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmbeddingFactory } from './embeddings/embedding-factory.service';
import { EmbeddingsService } from './embeddings/embeddings.service';
import { ChromaVectorStoreService } from './vectore-store/chroma-vector-store.service';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'OLLAMA_EMBEDDINGS',
      useFactory: (config: ConfigService) =>
        new OllamaEmbeddings({
          model: config.get('EMBED_MODEL', 'mxbai-embed-large'),
          baseUrl: config.get('OLLAMA_BASE_URL', 'http://localhost:11434'),
        }),
      inject: [ConfigService],
    },
    {
      provide: EmbeddingFactory,
      useFactory: (config: ConfigService) =>
        new EmbeddingFactory(config.get('OLLAMA_BASE_URL', 'http://localhost:11434')),
      inject: [ConfigService],
    },
    {
      provide: EmbeddingsService,
      useFactory: (embeddings: OllamaEmbeddings) => {
        const svc = new EmbeddingsService();
        svc.setEmbeddings(embeddings);
        return svc;
      },
      inject: ['OLLAMA_EMBEDDINGS'],
    },
    {
      provide: ChromaVectorStoreService,
      useFactory: (embeddings: OllamaEmbeddings, config: ConfigService) => {
        return new ChromaVectorStoreService(embeddings, {
          collectionName: config.get('CHROMA_COLLECTION', 'knowledge_base'),
          url: config.get('CHROMA_URL', 'http://localhost:8000'),
        });
      },
      inject: ['OLLAMA_EMBEDDINGS', ConfigService],
    },
  ],
  exports: [EmbeddingFactory, EmbeddingsService, ChromaVectorStoreService],
})
export class LocalAIModule {}
