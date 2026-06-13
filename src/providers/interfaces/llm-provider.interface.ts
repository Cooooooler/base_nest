import { Observable } from 'rxjs';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatParams {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ChatChunk {
  content: string;
  isEnd: boolean;
  model?: string;
}

export interface LlmProvider {
  chat(params: ChatParams): Promise<ChatResponse>;
  chatStream(params: ChatParams): Observable<ChatChunk>;
  embed?(texts: string[]): Promise<number[][]>;
}

export type LlmProviderType = 'openai' | 'anthropic' | 'ollama' | 'openai-compatible' | 'langchain-ollama';
