import { Injectable, Logger } from '@nestjs/common';
import { ProvidersService } from '../../../providers/providers.service';
import { ContextService } from '../context.service';
import { NodeExecutionResult, NodeExecutor } from './node-executor.interface';

@Injectable()
export class LLMNodeExecutor implements NodeExecutor {
  readonly type = 'llm';
  private readonly logger = new Logger(LLMNodeExecutor.name);

  constructor(private readonly providersService: ProvidersService) {}

  async execute(
    _nodeId: string,
    config: Record<string, any>,
    context: ContextService
  ): Promise<NodeExecutionResult> {
    const resolved = context.resolveConfig(config);
    const { providerId, model, prompt, temperature = 0.7, maxTokens = 4096 } = resolved;

    const client = await this.providersService.getProviderClient(providerId);

    const response = await client.chat({
      model,
      messages: [{ role: 'system' as const, content: prompt }],
      temperature: Number(temperature),
      maxTokens: Number(maxTokens),
    });

    return {
      outputs: {
        content: response.content,
        tokens: response.usage
          ? {
              prompt: response.usage.promptTokens,
              completion: response.usage.completionTokens,
              total: response.usage.totalTokens,
            }
          : { prompt: 0, completion: 0, total: 0 },
      },
    };
  }
}
