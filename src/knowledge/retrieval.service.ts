import { Injectable } from '@nestjs/common';

@Injectable()
export class RetrievalService {
  // eslint-disable-next-line @typescript-eslint/require-await
  async search(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _knowledgeBaseId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _query: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _topK?: number,
  ): Promise<unknown[]> {
    return [];
  }
}
