import { Injectable } from '@nestjs/common';
import { ContextService } from '../context.service';
import { NodeExecutionResult, NodeExecutor } from './node-executor.interface';

@Injectable()
export class EndNodeExecutor implements NodeExecutor {
  readonly type = 'end';

  execute(
    _nodeId: string,
    config: Record<string, any>,
    context: ContextService
  ): Promise<NodeExecutionResult> {
    const resolved = context.resolveConfig(config);
    const output = resolved.output !== undefined ? { result: resolved.output } : { result: null };
    return Promise.resolve({ outputs: output });
  }
}
