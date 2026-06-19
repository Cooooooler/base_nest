export interface App {
  id: string;
  name: string;
  description: string | null;
  providerId: string;
  modelId: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  userId: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  appId: string;
  title: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens: { prompt: number; completion: number; total: number } | null;
  metadata: Record<string, any> | null;
  createdAt: string;
}
