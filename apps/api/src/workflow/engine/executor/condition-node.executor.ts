import { Injectable } from '@nestjs/common';
import { NodeExecutor, NodeExecutionResult } from './node-executor.interface';
import { ContextService } from '../context.service';

@Injectable()
export class ConditionNodeExecutor implements NodeExecutor {
  readonly type = 'condition';

  async execute(
    _nodeId: string,
    config: Record<string, any>,
    context: ContextService,
  ): Promise<NodeExecutionResult> {
    const resolved = context.resolveConfig(config);
    const expression = resolved.expression || 'true';

    try {
      const result = !!(new Function('return ' + expression)());
      return { outputs: { result } };
    } catch {
      return { outputs: { result: false } };
    }
  }
}
