import { Embeddings } from '@langchain/core/embeddings';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Observable } from 'rxjs';
import {
  ChatChunk,
  ChatParams,
  ChatResponse,
  LlmProvider,
} from '../interfaces/llm-provider.interface';

/**
 * Factory that creates a LangChain BaseChatModel for a given model name.
 */
export type ModelFactory = (model: string) => BaseChatModel;

export class LangChainAdapter implements LlmProvider {
  constructor(
    private readonly modelFactory: ModelFactory,
    private readonly embeddings?: Embeddings
  ) {}

  private createModel(params: ChatParams): BaseChatModel {
    return this.modelFactory(params.model);
  }

  async chat(params: ChatParams): Promise<ChatResponse> {
    const model = this.createModel(params);
    const messages = params.messages.map(({ role, content }) => {
      switch (role) {
        case 'system':
          return new SystemMessage(content);
        case 'assistant':
          return new AIMessage(content);
        default:
          return new HumanMessage(content);
      }
    });

    const response = await model.invoke(messages);
    const usageMeta = (
      response as {
        usage_metadata?: { input_tokens: number; output_tokens: number; total_tokens: number };
      }
    ).usage_metadata;

    return {
      content: typeof response.content === 'string' ? response.content : '',
      model: params.model,
      usage: usageMeta
        ? {
            promptTokens: usageMeta.input_tokens,
            completionTokens: usageMeta.output_tokens,
            totalTokens: usageMeta.total_tokens,
          }
        : undefined,
    };
  }

  chatStream(params: ChatParams): Observable<ChatChunk> {
    return new Observable<ChatChunk>((subscriber) => {
      void (async () => {
        try {
          const model = this.createModel(params);
          const messages = params.messages.map(({ role, content }) => {
            switch (role) {
              case 'system':
                return new SystemMessage(content);
              case 'assistant':
                return new AIMessage(content);
              default:
                return new HumanMessage(content);
            }
          });

          const stream = await model.stream(messages);

          for await (const chunk of stream) {
            const content = typeof chunk.content === 'string' ? chunk.content : '';
            const reasoning: string | undefined =
              (chunk.additional_kwargs?.thinking as string | undefined) ||
              (chunk.additional_kwargs?.reasoning_content as string | undefined) ||
              undefined;
            subscriber.next({ content, reasoning, isEnd: false });
          }

          subscriber.next({ content: '', isEnd: true });
          subscriber.complete();
        } catch (err) {
          subscriber.error(err);
        }
      })();
    });
  }

  async embed(texts: string[]): Promise<number[][]> {
    return this.embeddings!.embedDocuments(texts);
  }
}
