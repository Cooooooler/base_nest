import { ChatAnthropic } from '@langchain/anthropic';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatOllama } from '@langchain/ollama';
import { ChatOpenAI } from '@langchain/openai';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { App } from '../chat/entities/app.entity';
import { decrypt, encrypt } from '../common/crypto.util';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { CreateModelDto } from './dto/create-model.dto';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateModelDto } from './dto/update-model.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ApiKey } from './entities/api-key.entity';
import { ModelProvider, needsApiKey, type ProviderType } from './entities/model-provider.entity';
import { Model } from './entities/model.entity';
import { LlmProvider } from './interfaces/llm-provider.interface';
import { getPresetModelsByType } from './preset-models';
import { LangChainAdapter } from './strategies/langchain-adapter';

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
    private readonly modelRepo: Repository<Model>,
    @InjectRepository(App)
    private readonly appRepo: Repository<App>,
    @InjectDataSource()
    private readonly dataSource: DataSource
  ) {}

  async findAllProviders(userId: string): Promise<ModelProvider[]> {
    return this.providerRepo.find({
      where: { userId },
      relations: { apiKeys: true, models: true },
    });
  }

  async findProviderById(id: string, userId: string): Promise<ModelProvider | null> {
    return this.providerRepo.findOne({
      where: { id, userId },
      relations: { apiKeys: true, models: true },
    });
  }

  async createProvider(userId: string, dto: CreateProviderDto): Promise<ModelProvider> {
    const provider = this.providerRepo.create({ ...dto, userId });
    return this.providerRepo.save(provider);
  }

  async updateProvider(id: string, userId: string, dto: UpdateProviderDto): Promise<ModelProvider> {
    const provider = await this.providerRepo.findOneBy({ id, userId });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }
    Object.assign(provider, dto);
    return this.providerRepo.save(provider);
  }

  async deleteProvider(id: string, userId: string): Promise<void> {
    const provider = await this.providerRepo.findOne({
      where: { id, userId },
      relations: { apiKeys: true, models: true },
    });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.manager.delete(ApiKey, { providerId: id });
      await queryRunner.manager.delete(Model, { providerId: id });
      await queryRunner.manager.delete(ModelProvider, id);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  getPresetModels(type: string) {
    return getPresetModelsByType(type as ProviderType);
  }

  async findApiKeys(providerId: string, userId: string): Promise<ApiKey[]> {
    const provider = await this.providerRepo.findOneBy({ id: providerId, userId });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }
    return this.apiKeyRepo.find({ where: { providerId } });
  }

  async createApiKey(providerId: string, userId: string, dto: CreateApiKeyDto): Promise<ApiKey> {
    const provider = await this.providerRepo.findOneBy({ id: providerId, userId });
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

  async deleteApiKey(id: string, userId: string): Promise<void> {
    const key = await this.apiKeyRepo.findOne({
      where: { id },
      relations: { provider: true },
    });
    if (!key) throw new NotFoundException('API key not found');
    if (key.provider.userId !== userId) throw new NotFoundException('API key not found');
    await this.apiKeyRepo.delete(id);
  }

  async createModel(providerId: string, userId: string, dto: CreateModelDto): Promise<Model> {
    const provider = await this.providerRepo.findOneBy({ id: providerId, userId });
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

  async updateModel(modelId: string, dto: UpdateModelDto, userId: string): Promise<Model> {
    const model = await this.modelRepo.findOne({
      where: { id: modelId },
      relations: { provider: true },
    });
    if (!model) {
      throw new NotFoundException('Model not found');
    }
    if (model.provider.userId !== userId) {
      throw new NotFoundException('Model not found');
    }

    Object.assign(model, dto);
    return this.modelRepo.save(model);
  }

  async deleteModel(modelId: string, userId: string): Promise<void> {
    // Verify the model belongs to a provider owned by this user
    const model = await this.modelRepo.findOne({
      where: { id: modelId },
      relations: { provider: true },
    });
    if (!model) {
      throw new NotFoundException('Model not found');
    }
    if (model.provider.userId !== userId) {
      throw new NotFoundException('Model not found');
    }

    const appCount = await this.appRepo.count({ where: { modelId } });
    if (appCount > 0) {
      throw new BadRequestException(
        `该模型已被 ${appCount} 个应用使用，请先删除关联应用后再删除模型`
      );
    }

    await this.modelRepo.delete(modelId);
  }

  async findModels(providerId: string, userId: string): Promise<Model[]> {
    const provider = await this.providerRepo.findOneBy({ id: providerId, userId });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }
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

      const activeKey = provider.apiKeys.some((k) => k.isActive);
      if (!activeKey) {
        throw new NotFoundException('No active API key found');
      }
    }

    const decryptedKey = keyRequired
      ? decrypt(provider.apiKeys.find((k) => k.isActive)!.encryptedKey)
      : '';
    const baseUrl = provider.baseUrl || undefined;

    // Map langchain-ollama → ollama for backward compatibility
    const normalizedType = provider.type === 'langchain-ollama' ? 'ollama' : provider.type;

    const modelFactory = this.createModelFactory(normalizedType, decryptedKey, baseUrl);
    return new LangChainAdapter(modelFactory);
  }

  private createModelFactory(
    type: string,
    apiKey: string,
    baseUrl?: string
  ): (model: string) => BaseChatModel {
    switch (type) {
      case 'openai':
      case 'openai-compatible':
        return (model: string) =>
          new ChatOpenAI({ model, apiKey, configuration: { baseURL: baseUrl } });
      case 'anthropic':
        return (model: string) =>
          new ChatAnthropic({ model, apiKey, clientOptions: { baseURL: baseUrl } });
      case 'ollama':
        return (model: string) => new ChatOllama({ model, baseUrl });
      default:
        throw new Error(`Unsupported provider type: ${type}`);
    }
  }
}
