import { Injectable } from '@nestjs/common';
import { ContextService } from '../context.service';
import { NodeExecutionResult, NodeExecutor } from './node-executor.interface';

@Injectable()
export class StartNodeExecutor implements NodeExecutor {
  readonly type = 'start';

  execute(
    _nodeId: string,
    _config: Record<string, any>,
    context: ContextService
  ): Promise<NodeExecutionResult> {
    const snapshot = context.snapshot();
    const inputs: Record<string, any> = {};
    for (const [key, value] of snapshot) {
      if (key.startsWith('inputs.') && key !== 'inputs') {
        inputs[key.slice(7)] = value;
      }
    }
    return Promise.resolve({ outputs: inputs });
  }
}
