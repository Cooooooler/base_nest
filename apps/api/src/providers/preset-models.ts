import type { ProviderType } from './entities/model-provider.entity';

export interface PresetModel {
  name: string;
  displayName: string;
  contextWindow: number;
  maxOutput: number;
  capabilities: Record<string, boolean>;
}

export const PRESET_MODELS: Record<ProviderType, PresetModel[]> = {
  openai: [
    {
      name: 'gpt-4o',
      displayName: 'GPT-4o',
      contextWindow: 128000,
      maxOutput: 16384,
      capabilities: { streaming: true, functionCalling: true, vision: true },
    },
    {
      name: 'gpt-4o-mini',
      displayName: 'GPT-4o Mini',
      contextWindow: 128000,
      maxOutput: 16384,
      capabilities: { streaming: true, functionCalling: true, vision: true },
    },
    {
      name: 'gpt-4-turbo',
      displayName: 'GPT-4 Turbo',
      contextWindow: 128000,
      maxOutput: 4096,
      capabilities: { streaming: true, functionCalling: true, vision: true },
    },
    {
      name: 'gpt-3.5-turbo',
      displayName: 'GPT-3.5 Turbo',
      contextWindow: 16385,
      maxOutput: 4096,
      capabilities: { streaming: true, functionCalling: true },
    },
  ],
  anthropic: [
    {
      name: 'claude-sonnet-4-20250514',
      displayName: 'Claude Sonnet 4',
      contextWindow: 200000,
      maxOutput: 8192,
      capabilities: { streaming: true, functionCalling: true, vision: true },
    },
    {
      name: 'claude-haiku-3-5-20241022',
      displayName: 'Claude Haiku 3.5',
      contextWindow: 200000,
      maxOutput: 8192,
      capabilities: { streaming: true, functionCalling: true, vision: true },
    },
  ],
  ollama: [
    {
      name: 'llama3.2',
      displayName: 'Llama 3.2',
      contextWindow: 8192,
      maxOutput: 4096,
      capabilities: { streaming: true },
    },
    {
      name: 'qwen2.5',
      displayName: 'Qwen 2.5',
      contextWindow: 32768,
      maxOutput: 8192,
      capabilities: { streaming: true },
    },
    {
      name: 'deepseek-r1',
      displayName: 'DeepSeek R1',
      contextWindow: 32768,
      maxOutput: 8192,
      capabilities: { streaming: true },
    },
    {
      name: 'mistral',
      displayName: 'Mistral',
      contextWindow: 32768,
      maxOutput: 8192,
      capabilities: { streaming: true },
    },
  ],
  'openai-compatible': [],
  'langchain-ollama': [],
};

export function getPresetModelsByType(type: ProviderType): PresetModel[] {
  return PRESET_MODELS[type] ?? [];
}
