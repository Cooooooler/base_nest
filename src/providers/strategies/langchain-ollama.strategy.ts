import { ChatOllama } from '@langchain/ollama';
import { Observable } from 'rxjs';
import { LlmProvider, ChatParams, ChatResponse, ChatChunk } from '../interfaces/llm-provider.interface';

export class LangChainOllamaStrategy implements LlmProvider {
  private client: ChatOllama;

  constructor(
    _apiKey: string,
    baseUrl?: string
  ) {
    this.client = new ChatOllama({
      model: 'qwen2.5:7b',
      baseUrl: baseUrl || 'http://localhost:11434',
      temperature: 0.7,
    });
  }

  async chat(params: ChatParams): Promise<ChatResponse> {
    const response = await this.client.invoke(
      params.messages.map(({ role, content }) => ({
        role,
        content,
      }))
    );

    return {
      content: typeof response.content === 'string' ? response.content : JSON.stringify(response.content),
      model: 'qwen2.5:7b',
      usage: response.usage_metadata
        ? {
            promptTokens: response.usage_metadata.input_tokens,
            completionTokens: response.usage_metadata.output_tokens,
            totalTokens: response.usage_metadata.total_tokens,
          }
        : undefined,
    };
  }

  chatStream(params: ChatParams): Observable<ChatChunk> {
    return new Observable<ChatChunk>((subscriber) => {
      (async () => {
        try {
          const stream = await this.client.stream(
            params.messages.map(({ role, content }) => ({
              role,
              content,
            }))
          );

          for await (const chunk of stream) {
            const content = typeof chunk.content === 'string' ? chunk.content : '';
            subscriber.next({
              content,
              isEnd: false,
              model: 'qwen2.5:7b',
            });
          }

          subscriber.next({ content: '', isEnd: true, model: 'qwen2.5:7b' });
          subscriber.complete();
        } catch (err) {
          subscriber.error(err);
        }
      })();
    });
  }
}
