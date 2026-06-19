import OpenAI from 'openai';
import { Observable } from 'rxjs';
import {
  ChatChunk,
  ChatParams,
  ChatResponse,
  LlmProvider,
} from '../interfaces/llm-provider.interface';

export class OpenAiStrategy implements LlmProvider {
  private client: OpenAI;

  constructor(apiKey: string, baseUrl?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || 'sk-no-key-required',
      baseURL: baseUrl || 'https://api.openai.com/v1',
    });
  }

  async chat(params: ChatParams): Promise<ChatResponse> {
    const response = await this.client.chat.completions.create({
      model: params.model,
      messages: params.messages.map(({ role, content }) => ({ role, content })),
      temperature: params.temperature,
      max_tokens: params.maxTokens,
    });

    return {
      content: response.choices[0]?.message?.content || '',
      model: response.model,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }

  chatStream(params: ChatParams): Observable<ChatChunk> {
    return new Observable<ChatChunk>((subscriber) => {
      void (async () => {
        try {
          const stream = await this.client.chat.completions.create({
            model: params.model,
            messages: params.messages.map(({ role, content }) => ({ role, content })),
            temperature: params.temperature,
            max_tokens: params.maxTokens,
            stream: true,
          });

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            const isEnd = chunk.choices[0]?.finish_reason === 'stop';
            subscriber.next({ content, isEnd, model: chunk.model });
            if (isEnd) {
              subscriber.complete();
              return;
            }
          }
          subscriber.complete();
        } catch (error) {
          subscriber.error(error);
        }
      })();
    });
  }

  async embed(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
    });
    return response.data.map((item) => item.embedding);
  }
}
