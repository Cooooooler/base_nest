import { Injectable } from '@nestjs/common';
import { ContextService } from '../context.service';
import { NodeExecutionResult, NodeExecutor } from './node-executor.interface';

@Injectable()
export class CodeNodeExecutor implements NodeExecutor {
  readonly type = 'code';
  private readonly TIMEOUT_MS = 30_000;

  async execute(
    _nodeId: string,
    config: Record<string, any>,
    context: ContextService
  ): Promise<NodeExecutionResult> {
    const resolved = context.resolveConfig(config);
    const { code, inputs = {} } = resolved;

    const logs: string[] = [];
    const sandbox = {
      inputs,
      console: {
        log: (...args: any[]) => logs.push(args.map(String).join(' ')),
      },
      JSON,
      Math,
      Date,
      Array,
      Object,
      String,
      Number,
      Boolean,
      RegExp,
      Map,
      Set,
    };

    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const fn = new Function(...Object.keys(sandbox), code);
    const result = await Promise.race([
      Promise.resolve(fn(...Object.values(sandbox))),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Code execution timed out')), this.TIMEOUT_MS)
      ),
    ]);

    return {
      outputs: { result, logs },
    };
  }
}
