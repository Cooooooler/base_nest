import { OllamaEmbeddings } from '@langchain/ollama';
import { DynamicModule, Global, Module } from '@nestjs/common';
import { EmbeddingFactory } from './embeddings/embedding-factory.service';
import { EmbeddingsService } from './embeddings/embeddings.service';
import { ChromaVectorStoreService } from './vectore-store/chroma-vector-store.service';

export interface LocalAIOptions {
  ollamaBaseUrl?: string;
  llmModel?: string;
  embedModel?: string;
  chromaUrl?: string;
  chromaCollectionName?: string;
}

@Global()
@Module({})
export class LocalAIModule {
  static forRoot(options: LocalAIOptions = {}): DynamicModule {
    const {
      ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      embedModel = process.env.EMBED_MODEL || 'mxbai-embed-large',
      chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000',
      chromaCollectionName = process.env.CHROMA_COLLECTION || 'knowledge_base',
    } = options;

    return {
      module: LocalAIModule,
      providers: [
        {
          provide: 'OLLAMA_BASE_URL',
          useValue: ollamaBaseUrl,
        },
        {
          provide: 'OLLAMA_EMBEDDINGS',
          useFactory: () =>
            new OllamaEmbeddings({
              model: embedModel,
              baseUrl: ollamaBaseUrl,
            }),
        },
        {
          provide: EmbeddingFactory,
          useFactory: () => new EmbeddingFactory(ollamaBaseUrl),
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
          useFactory: (embeddings: OllamaEmbeddings) => {
            return new ChromaVectorStoreService(embeddings, {
              collectionName: chromaCollectionName,
              url: chromaUrl,
            });
          },
          inject: ['OLLAMA_EMBEDDINGS'],
        },
      ],
      exports: [EmbeddingFactory, EmbeddingsService, ChromaVectorStoreService],
    };
  }
}
