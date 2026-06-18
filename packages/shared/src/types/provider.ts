export interface ModelProvider {
  id: string;
  name: string;
  type: 'openai' | 'anthropic' | 'ollama' | 'openai-compatible' | 'langchain-ollama';
  isEnabled: boolean;
  baseUrl?: string | null;
  apiKeys: ApiKey[];
  models: Model[];
  createdAt: string;
}

export interface ApiKey {
  id: string;
  providerId: string;
  name: string;
  maskedKey: string;
  isActive: boolean;
  createdAt: string;
}

export interface Model {
  id: string;
  providerId: string;
  name: string;
  displayName: string;
  contextWindow: number;
  maxOutput: number;
  capabilities: Record<string, boolean>;
  isBuiltin: boolean;
  createdAt: string;
}

export interface CreateProviderDto {
  name: string;
  type: ModelProvider['type'];
  isEnabled?: boolean;
  baseUrl?: string;
}

export interface CreateApiKeyDto {
  name: string;
  apiKey: string;
}

export interface CreateModelDto {
  name: string;
  displayName: string;
  contextWindow?: number;
  maxOutput?: number;
  capabilities?: Record<string, boolean>;
}

export interface PresetModel {
  name: string;
  displayName: string;
  contextWindow: number;
  maxOutput: number;
  capabilities: Record<string, boolean>;
}
