import { Observable } from 'rxjs';
import { LlmProvider, ChatParams, ChatResponse, ChatChunk } from '../interfaces/llm-provider.interface';

export class OllamaStrategy implements LlmProvider {
  private baseUrl: string;

  constructor(_apiKey: string, baseUrl?: string) {
    this.baseUrl = (baseUrl || 'http://localhost:11434').replace(/\/$/, '');
  }

  async chat(params: ChatParams): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages.map(({ role, content }) => ({ role, content })),
        options: {
          temperature: params.temperature,
          num_predict: params.maxTokens,
        },
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.message?.content || '',
      model: data.model,
    };
  }

  chatStream(params: ChatParams): Observable<ChatChunk> {
    return new Observable<ChatChunk>((subscriber) => {
      (async () => {
        try {
          const response = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: params.model,
              messages: params.messages.map(({ role, content }) => ({ role, content })),
              options: {
                temperature: params.temperature,
                num_predict: params.maxTokens,
              },
              stream: true,
            }),
          });

          if (!response.ok) {
            subscriber.error(new Error(`Ollama stream request failed: ${response.status}`));
            return;
          }

          const reader = response.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const data = JSON.parse(line);
                subscriber.next({
                  content: data.message?.content || '',
                  isEnd: data.done === true,
                  model: data.model,
                });
              } catch {
                // skip malformed JSON lines
              }
            }
          }

          subscriber.complete();
        } catch (err) {
          subscriber.error(err);
        }
      })();
    });
  }
}
