import { Embeddings } from '@langchain/core/embeddings';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EmbeddingsService {
  private embeddings!: Embeddings;

  setEmbeddings(embeddings: Embeddings): void {
    this.embeddings = embeddings;
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    return this.embeddings.embedDocuments(texts);
  }

  async embedQuery(text: string): Promise<number[]> {
    return this.embeddings.embedQuery(text);
  }
}
