export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
  sources?: Array<{
    content: string;
    metadata: Record<string, any>;
    score?: number;
  }>;
}

export interface AssistantMessageProps {
  msg: ChatMessage;
  streaming: boolean;
}
