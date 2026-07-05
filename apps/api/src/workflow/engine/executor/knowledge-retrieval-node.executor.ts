import { Injectable } from '@nestjs/common';
import { RetrievalService } from '../../../knowledge/retrieval.service';
import { NodeExecutor, NodeExecutionResult } from './node-executor.interface';
import { ContextService } from '../context.service';

@Injectable()
export class KnowledgeRetrievalNodeExecutor implements NodeExecutor {
  readonly type = 'knowledge_retrieval';

  constructor(private readonly retrievalService: RetrievalService) {}

  async execute(
    _nodeId: string,
    config: Record<string, any>,
    context: ContextService,
  ): Promise<NodeExecutionResult> {
    const resolved = context.resolveConfig(config);
    const { knowledgeBaseId, query, topK = 4 } = resolved;

    const results = await this.retrievalService.searchWithScore(knowledgeBaseId, query, topK);
    return {
      outputs: {
        segments: results.map(r => ({
          content: r.content,
          metadata: r.metadata,
          score: r.score,
        })),
        combined: results.map((r, i) => `[${i + 1}] ${r.content}`).join('\n\n'),
      },
    };
  }
}
