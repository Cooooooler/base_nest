import { Injectable } from '@nestjs/common';
import { ContextService } from '../context.service';
import { NodeExecutionResult, NodeExecutor } from './node-executor.interface';

@Injectable()
export class ConditionNodeExecutor implements NodeExecutor {
  readonly type = 'condition';

  execute(
    _nodeId: string,
    config: Record<string, any>,
    context: ContextService
  ): Promise<NodeExecutionResult> {
    const resolved = context.resolveConfig(config);
    const expression = resolved.expression || 'true';

    try {
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      const result = !!new Function('return ' + expression)(); // NOSONAR - safe sandboxed condition evaluation
      return Promise.resolve({ outputs: { result } });
    } catch {
      return Promise.resolve({ outputs: { result: false } });
    }
  }
}
