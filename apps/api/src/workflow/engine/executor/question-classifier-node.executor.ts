import { Injectable } from '@nestjs/common';
import { ProvidersService } from '../../../providers/providers.service';
import { ContextService } from '../context.service';
import { NodeExecutionResult, NodeExecutor } from './node-executor.interface';

@Injectable()
export class QuestionClassifierNodeExecutor implements NodeExecutor {
  readonly type = 'question_classifier';

  constructor(private readonly providersService: ProvidersService) {}

  async execute(
    _nodeId: string,
    config: Record<string, any>,
    context: ContextService
  ): Promise<NodeExecutionResult> {
    const resolved = context.resolveConfig(config);
    const { providerId, model, instruction, categories, input } = resolved;

    const categoryList = (categories as Array<{ id: string; name: string; description?: string }>)
      .map((c) => `- ${c.id}: ${c.name}${c.description ? ` — ${c.description}` : ''}`)
      .join('\n');

    const prompt = `${instruction}\n\n类别：\n${categoryList}\n\n用户输入：${input}\n\n请只返回类别 ID，不要有其他内容。`;

    const client = await this.providersService.getProviderClient(providerId);
    const response = await client.chat({
      model,
      messages: [{ role: 'system' as const, content: prompt }],
      temperature: 0.1,
    });

    const category = response.content.trim().toLowerCase();
    return { outputs: { category } };
  }
}
