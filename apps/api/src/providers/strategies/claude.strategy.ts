import Anthropic from '@anthropic-ai/sdk';
import { Observable, from, map } from 'rxjs';
import {
  ChatChunk,
  ChatParams,
  ChatResponse,
  LlmProvider,
} from '../interfaces/llm-provider.interface';

export class ClaudeStrategy implements LlmProvider {
  private client: Anthropic;

  constructor(apiKey: string, baseUrl?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || 'sk-no-key-required',
      baseURL: baseUrl || undefined,
    });
  }

  async chat(params: ChatParams): Promise<ChatResponse> {
    const systemMsg = params.messages.find((m) => m.role === 'system');
    const nonSystemMessages = params.messages
      .filter((m) => m.role !== 'system')
      .map(({ role, content }) => ({
        role: role as 'user' | 'assistant',
        content,
      }));

    const response = await this.client.messages.create({
      model: params.model,
      messages: nonSystemMessages,
      system: systemMsg?.content,
      temperature: params.temperature,
      max_tokens: params.maxTokens || 4096,
    });

    const contentBlock = response.content[0];

    return {
      content: contentBlock?.type === 'text' ? contentBlock.text : '',
      model: response.model,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }

  chatStream(params: ChatParams): Observable<ChatChunk> {
    const systemMsg = params.messages.find((m) => m.role === 'system');
    const nonSystemMessages = params.messages
      .filter((m) => m.role !== 'system')
      .map(({ role, content }) => ({
        role: role as 'user' | 'assistant',
        content,
      }));

    const stream = this.client.messages.stream({
      model: params.model,
      messages: nonSystemMessages,
      system: systemMsg?.content,
      temperature: params.temperature,
      max_tokens: params.maxTokens || 4096,
    });

    return from(stream).pipe(
      map((event) => ({
        content: (event as any).delta?.text || '',
        isEnd: (event as any).type === 'message_stop',
        model: params.model,
      }))
    );
  }
}
