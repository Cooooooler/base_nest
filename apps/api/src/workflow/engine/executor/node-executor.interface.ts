import { ContextService } from '../context.service';

export interface NodeExecutionResult {
  outputs: Record<string, any>;
  summary?: string;
}

export interface NodeExecutor {
  readonly type: string;
  execute(
    nodeId: string,
    config: Record<string, any>,
    context: ContextService,
  ): Promise<NodeExecutionResult>;
}
