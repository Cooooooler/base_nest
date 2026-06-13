import { DynamicModule, Global, Module } from '@nestjs/common';
import { OllamaEmbeddings } from '@langchain/ollama';
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
      ollamaBaseUrl = 'http://localhost:11434',
      embedModel = 'mxbai-embed-large',
      chromaUrl = 'http://localhost:8000',
      chromaCollectionName = 'knowledge_base',
    } = options;

    return {
      module: LocalAIModule,
      providers: [
        {
          provide: 'OLLAMA_EMBEDDINGS',
          useFactory: () =>
            new OllamaEmbeddings({
              model: embedModel,
              baseUrl: ollamaBaseUrl,
            }),
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
      exports: [EmbeddingsService, ChromaVectorStoreService],
    };
  }
}
