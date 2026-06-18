import type { App, Conversation, Message } from '@base/shared';
import { apiClient, getAccessToken } from './client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// ---- Apps ----
export function getApps() {
  return apiClient<App[]>('/apps');
}

export function getApp(id: string) {
  return apiClient<App>(`/apps/${id}`);
}

export function createApp(dto: {
  name: string;
  description?: string;
  providerId: string;
  modelId: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}) {
  return apiClient<App>('/apps', { method: 'POST', json: dto });
}

export function updateApp(
  id: string,
  dto: Partial<{
    name: string;
    description: string;
    systemPrompt: string;
    temperature: number;
    maxTokens: number;
  }>
) {
  return apiClient<App>(`/apps/${id}`, { method: 'PATCH', json: dto });
}

export function deleteApp(id: string) {
  return apiClient<void>(`/apps/${id}`, { method: 'DELETE' });
}

// ---- Conversations ----
export function getConversations(appId: string) {
  return apiClient<Conversation[]>(`/apps/${appId}/conversations`);
}

export function createConversation(appId: string, title?: string) {
  return apiClient<Conversation>(`/apps/${appId}/conversations`, {
    method: 'POST',
    json: { title },
  });
}

export function deleteConversation(appId: string, convId: string) {
  return apiClient<void>(`/apps/${appId}/conversations/${convId}`, { method: 'DELETE' });
}

// ---- Messages ----
export function getMessages(appId: string, convId: string) {
  return apiClient<Message[]>(`/apps/${appId}/conversations/${convId}/messages`);
}

export interface ChatChunk {
  content: string;
  isEnd: boolean;
  error?: string;
}

export async function* streamChat(
  appId: string,
  convId: string,
  content: string
): AsyncGenerator<ChatChunk> {
  const response = await fetch(`${API_BASE}/apps/${appId}/conversations/${convId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAccessToken()}`,
    },
    body: JSON.stringify({ content }),
  });

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
      if (line.startsWith('data: ')) {
        yield JSON.parse(line.slice(6)) as ChatChunk;
      }
    }
  }
}
