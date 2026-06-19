import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { decrypt, encrypt } from '../common/crypto.util';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { CreateModelDto } from './dto/create-model.dto';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateModelDto } from './dto/update-model.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ApiKey } from './entities/api-key.entity';
import { ModelProvider, needsApiKey } from './entities/model-provider.entity';
import { Model } from './entities/model.entity';
import { LlmProvider } from './interfaces/llm-provider.interface';
import { getPresetModelsByType } from './preset-models';
import { ClaudeStrategy } from './strategies/claude.strategy';
import { LangChainOllamaStrategy } from './strategies/langchain-ollama.strategy';
import { OllamaStrategy } from './strategies/ollama.strategy';
import { OpenAiCompatibleStrategy } from './strategies/openai-compatible.strategy';
import { OpenAiStrategy } from './strategies/openai.strategy';

function maskApiKey(key: string): string {
  if (key.length <= 8) return '****';
  return key.substring(0, 4) + '****' + key.substring(key.length - 3);
}

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(ModelProvider)
    private readonly providerRepo: Repository<ModelProvider>,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepo: Repository<ApiKey>,
    @InjectRepository(Model)
    private readonly modelRepo: Repository<Model>
  ) {}

  async findAllProviders(): Promise<ModelProvider[]> {
    return this.providerRepo.find({ relations: { apiKeys: true, models: true } });
  }

  async findProviderById(id: string): Promise<ModelProvider | null> {
    return this.providerRepo.findOne({
      where: { id },
      relations: { apiKeys: true, models: true },
    });
  }

  async createProvider(dto: CreateProviderDto): Promise<ModelProvider> {
    const provider = this.providerRepo.create(dto);
    return this.providerRepo.save(provider);
  }

  async updateProvider(id: string, dto: UpdateProviderDto): Promise<ModelProvider> {
    const provider = await this.providerRepo.findOneBy({ id });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }
    Object.assign(provider, dto);
    return this.providerRepo.save(provider);
  }

  async deleteProvider(id: string): Promise<void> {
    const provider = await this.providerRepo.findOne({
      where: { id },
      relations: { apiKeys: true, models: true },
    });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }
    // Delete related entities first to avoid FK constraints
    await this.apiKeyRepo.delete({ providerId: id });
    await this.modelRepo.delete({ providerId: id });
    await this.providerRepo.delete(id);
  }

  getPresetModels(type: string) {
    return getPresetModelsByType(type as any);
  }

  async findApiKeys(providerId: string): Promise<ApiKey[]> {
    return this.apiKeyRepo.find({ where: { providerId } });
  }

  async createApiKey(providerId: string, dto: CreateApiKeyDto): Promise<ApiKey> {
    const provider = await this.providerRepo.findOneBy({ id: providerId });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const encryptedKey = encrypt(dto.apiKey);
    const apiKey = this.apiKeyRepo.create({
      providerId,
      name: dto.name,
      encryptedKey,
      maskedKey: maskApiKey(dto.apiKey),
    });

    return this.apiKeyRepo.save(apiKey);
  }

  async deleteApiKey(id: string): Promise<void> {
    await this.apiKeyRepo.delete(id);
  }

  async createModel(providerId: string, dto: CreateModelDto): Promise<Model> {
    const provider = await this.providerRepo.findOneBy({ id: providerId });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const model = this.modelRepo.create({
      providerId,
      name: dto.name,
      displayName: dto.displayName,
      contextWindow: dto.contextWindow ?? 0,
      maxOutput: dto.maxOutput ?? 0,
      capabilities: dto.capabilities ?? {},
      isBuiltin: false,
    });

    return this.modelRepo.save(model);
  }

  async updateModel(modelId: string, dto: UpdateModelDto): Promise<Model> {
    const model = await this.modelRepo.findOneBy({ id: modelId });
    if (!model) {
      throw new NotFoundException('Model not found');
    }

    Object.assign(model, dto);
    return this.modelRepo.save(model);
  }

  async deleteModel(modelId: string): Promise<void> {
    const result = await this.modelRepo.delete(modelId);
    if (result.affected === 0) {
      throw new NotFoundException('Model not found');
    }
  }

  async findModels(providerId: string): Promise<Model[]> {
    return this.modelRepo.find({ where: { providerId } });
  }

  async getProviderClient(providerId: string): Promise<LlmProvider> {
    const provider = await this.providerRepo.findOne({
      where: { id: providerId, isEnabled: true },
      relations: { apiKeys: true },
    });

    if (!provider) {
      throw new NotFoundException('No enabled provider found');
    }

    // 本地 provider（ollama / langchain-ollama）不需要 API key
    const keyRequired = needsApiKey(provider.type);

    if (keyRequired) {
      if (provider.apiKeys.length === 0) {
        throw new NotFoundException('No API key found for this provider');
      }

      const activeKey = provider.apiKeys.find((k) => k.isActive);
      if (!activeKey) {
        throw new NotFoundException('No active API key found');
      }
    }

    const decryptedKey = keyRequired
      ? decrypt(provider.apiKeys.find((k) => k.isActive)!.encryptedKey)
      : '';

    switch (provider.type) {
      case 'openai':
        return new OpenAiStrategy(decryptedKey, provider.baseUrl ?? undefined);
      case 'anthropic':
        return new ClaudeStrategy(decryptedKey, provider.baseUrl ?? undefined);
      case 'ollama':
        return new OllamaStrategy(decryptedKey, provider.baseUrl ?? undefined);
      case 'openai-compatible':
        return new OpenAiCompatibleStrategy(decryptedKey, provider.baseUrl ?? '');
      case 'langchain-ollama':
        return new LangChainOllamaStrategy(decryptedKey, provider.baseUrl ?? undefined);
      default:
        throw new Error(`Unsupported provider type: ${provider.type as string}`);
    }
  }
}
