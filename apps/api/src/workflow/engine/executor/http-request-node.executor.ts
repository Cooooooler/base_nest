import { Injectable } from '@nestjs/common';
import { ContextService } from '../context.service';
import { NodeExecutionResult, NodeExecutor } from './node-executor.interface';

@Injectable()
export class HttpRequestNodeExecutor implements NodeExecutor {
  readonly type = 'http_request';

  async execute(
    _nodeId: string,
    config: Record<string, any>,
    context: ContextService
  ): Promise<NodeExecutionResult> {
    const resolved = context.resolveConfig(config);
    const { url, method = 'GET', headers = {}, body } = resolved;

    const fetchOptions: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
    };

    if (body && method !== 'GET') {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    const responseBody = await response.text();

    let parsedBody: any;
    try {
      parsedBody = JSON.parse(responseBody);
    } catch {
      parsedBody = responseBody;
    }

    return {
      outputs: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: parsedBody,
      },
    };
  }
}
