import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Injectable } from '@nestjs/common';

export interface ChunkResult {
  content: string;
  index: number;
  charCount: number;
  metadata: Record<string, any>;
}

@Injectable()
export class ChunkProcessorService {
  async chunkText(
    text: string,
    options: { chunkSize?: number; chunkOverlap?: number } = {}
  ): Promise<ChunkResult[]> {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: options.chunkSize || 500,
      chunkOverlap: options.chunkOverlap || 50,
    });

    const docs = await splitter.createDocuments([text]);

    return docs.map((doc, index) => ({
      content: doc.pageContent,
      index,
      charCount: doc.pageContent.length,
      metadata: doc.metadata,
    }));
  }

  async chunkPdf(
    pdfText: string,
    options: { chunkSize?: number; chunkOverlap?: number } = {}
  ): Promise<ChunkResult[]> {
    return this.chunkText(pdfText, options);
  }
}
