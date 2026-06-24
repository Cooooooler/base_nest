import { OllamaEmbeddings } from '@langchain/ollama';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EmbeddingFactory {
  constructor(private readonly ollamaBaseUrl: string) {}

  create(modelName: string): OllamaEmbeddings {
    return new OllamaEmbeddings({
      model: modelName,
      baseUrl: this.ollamaBaseUrl,
    });
  }
}
