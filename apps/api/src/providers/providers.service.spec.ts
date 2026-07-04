import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { fromPartial } from '@total-typescript/shoehorn';
import { App } from '../chat/entities/app.entity';
import * as cryptoUtil from '../common/crypto.util';
import { ApiKey } from './entities/api-key.entity';
import { ModelProvider } from './entities/model-provider.entity';
import { Model } from './entities/model.entity';
import { ProvidersService } from './providers.service';

jest.mock('../common/crypto.util');

const TEST_USER_ID = '893e135b-f517-43a9-9104-8922407eabd9';

describe('ProvidersService', () => {
  let service: ProvidersService;

  const mockProvider: ModelProvider = fromPartial({
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'OpenAI',
    type: 'openai',
    isEnabled: true,
    userId: TEST_USER_ID,
    baseUrl: null,
    createdAt: new Date(),
    apiKeys: [],
    models: [],
  });

  const mockProviderWithKeys: ModelProvider = fromPartial({
    ...mockProvider,
    apiKeys: [
      fromPartial({
        id: '660e8400-e29b-41d4-a716-446655440001',
        providerId: mockProvider.id,
        name: 'Production Key',
        encryptedKey: 'encrypted:value',
        maskedKey: 'sk-t****xxx',
        isActive: true,
        createdAt: new Date(),
      }),
    ],
  });

  const mockApiKey: ApiKey = fromPartial({
    id: '660e8400-e29b-41d4-a716-446655440001',
    providerId: mockProvider.id,
    name: 'Production Key',
    encryptedKey: 'encrypted:value',
    maskedKey: 'sk-t****xxx',
    isActive: true,
    createdAt: new Date(),
  });

  const mockRepo = {
    find: jest.fn().mockResolvedValue([mockProvider]),
    findOneBy: jest.fn().mockImplementation((where: any) => {
      if (
        where.id === mockProvider.id &&
        (where.userId === undefined || where.userId === TEST_USER_ID)
      )
        return mockProvider;
      if (where.id === undefined && where.userId === TEST_USER_ID) return mockProvider;
      return null;
    }),
    findOne: jest.fn().mockImplementation((opts: any) => {
      if (opts?.where?.isEnabled) {
        return mockProviderWithKeys;
      }
      if (opts?.where?.userId && opts?.where?.userId !== TEST_USER_ID) return null;
      return mockProvider;
    }),
    create: jest.fn().mockReturnValue(mockProvider),
    save: jest.fn().mockResolvedValue(mockProvider),
    delete: jest.fn().mockResolvedValue({ affected: 1, raw: {} }),
  };

  const mockApiKeyRepo = {
    find: jest.fn().mockResolvedValue([mockApiKey]),
    findOneBy: jest.fn().mockResolvedValue(mockApiKey),
    create: jest.fn().mockReturnValue(mockApiKey),
    save: jest.fn().mockResolvedValue(mockApiKey),
    delete: jest.fn().mockResolvedValue({ affected: 1, raw: {} }),
  };

  const mockModelRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findOneBy: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn().mockResolvedValue({ affected: 0, raw: {} }),
  };

  const mockAppRepo = {
    count: jest.fn().mockResolvedValue(0),
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue({
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        delete: jest.fn(),
      },
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    // Default: modelRepo.findOne returns null (not found) — tests that need it must override
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProvidersService,
        { provide: getRepositoryToken(ModelProvider), useValue: mockRepo },
        { provide: getRepositoryToken(ApiKey), useValue: mockApiKeyRepo },
        { provide: getRepositoryToken(Model), useValue: mockModelRepo },
        { provide: getRepositoryToken(App), useValue: mockAppRepo },
        { provide: getDataSourceToken(), useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<ProvidersService>(ProvidersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllProviders', () => {
    it('should return providers filtered by user', async () => {
      const result = await service.findAllProviders(TEST_USER_ID);
      expect(result).toEqual([mockProvider]);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { userId: TEST_USER_ID },
        relations: { apiKeys: true, models: true },
      });
    });
  });

  describe('findProviderById', () => {
    it('should return a provider by id scoped to user', async () => {
      const result = await service.findProviderById(mockProvider.id, TEST_USER_ID);
      expect(result).toEqual(mockProvider);
    });
  });

  describe('createProvider', () => {
    it('should create and return a provider with userId', async () => {
      const dto = { name: 'OpenAI', type: 'openai' as const };
      const result = await service.createProvider(TEST_USER_ID, dto);
      expect(result).toEqual(mockProvider);
      expect(mockRepo.create).toHaveBeenCalledWith({ ...dto, userId: TEST_USER_ID });
    });
  });

  describe('updateProvider', () => {
    const dto = { name: 'OpenAI Updated' };

    it('should update and return a provider', async () => {
      const result = await service.updateProvider(mockProvider.id, TEST_USER_ID, dto);
      expect(result).toEqual(mockProvider);
    });

    it('should throw NotFoundException if provider not found', async () => {
      await expect(service.updateProvider('nonexistent', TEST_USER_ID, dto)).rejects.toThrow(
        'Provider not found'
      );
    });
  });

  describe('deleteProvider', () => {
    it('should delete a provider', async () => {
      await service.deleteProvider(mockProvider.id, TEST_USER_ID);
    });

    it('should throw NotFoundException if provider not found', async () => {
      await expect(service.deleteProvider('nonexistent', 'other-user')).rejects.toThrow(
        'Provider not found'
      );
    });
  });

  describe('findApiKeys', () => {
    it('should return API keys for a provider', async () => {
      const result = await service.findApiKeys(mockProvider.id, TEST_USER_ID);
      expect(result).toEqual([mockApiKey]);
    });

    it('should throw if provider not found', async () => {
      await expect(service.findApiKeys('nonexistent', 'other-user')).rejects.toThrow(
        'Provider not found'
      );
    });
  });

  describe('createApiKey', () => {
    it('should encrypt and save an API key', async () => {
      jest.mocked(cryptoUtil.encrypt).mockReturnValue('encrypted:value');
      const dto = { name: 'Production', apiKey: 'sk-proj-xxx' };
      const result = await service.createApiKey(mockProvider.id, TEST_USER_ID, dto);
      expect(result.maskedKey).toBeDefined();
      expect(result.maskedKey).not.toContain('sk-proj');
    });

    it('should throw if provider not found', async () => {
      await expect(
        service.createApiKey('nonexistent', 'other-user', { name: 'test', apiKey: 'key' })
      ).rejects.toThrow('Provider not found');
    });
  });

  describe('deleteApiKey', () => {
    it('should delete an API key', async () => {
      const localApiKeyRepo = {
        ...mockApiKeyRepo,
        findOne: jest.fn().mockResolvedValue({ ...mockApiKey, provider: { userId: TEST_USER_ID } }),
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ProvidersService,
          { provide: getRepositoryToken(ModelProvider), useValue: mockRepo },
          { provide: getRepositoryToken(ApiKey), useValue: localApiKeyRepo },
          { provide: getRepositoryToken(Model), useValue: mockModelRepo },
          { provide: getRepositoryToken(App), useValue: mockAppRepo },
          { provide: getDataSourceToken(), useValue: mockDataSource },
        ],
      }).compile();
      const svc = module.get<ProvidersService>(ProvidersService);
      await expect(svc.deleteApiKey(mockApiKey.id, TEST_USER_ID)).resolves.not.toThrow();
    });
  });

  describe('createModel', () => {
    it('should create and return a model', async () => {
      mockRepo.findOneBy = jest.fn().mockResolvedValue(mockProvider);
      const localModelRepo = {
        ...mockModelRepo,
        create: jest.fn().mockReturnValue({
          id: '770e8400-e29b-41d4-a716-446655440002',
          providerId: mockProvider.id,
          name: 'gpt-4o',
          displayName: 'GPT-4o',
          contextWindow: 128000,
          maxOutput: 16384,
          capabilities: { streaming: true },
          isBuiltin: false,
        }),
        save: jest.fn().mockResolvedValue({
          id: '770e8400-e29b-41d4-a716-446655440002',
          providerId: mockProvider.id,
          name: 'gpt-4o',
          displayName: 'GPT-4o',
          contextWindow: 128000,
          maxOutput: 16384,
          capabilities: { streaming: true },
          isBuiltin: false,
        }),
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ProvidersService,
          { provide: getRepositoryToken(ModelProvider), useValue: mockRepo },
          { provide: getRepositoryToken(ApiKey), useValue: mockApiKeyRepo },
          { provide: getRepositoryToken(Model), useValue: localModelRepo },
          { provide: getRepositoryToken(App), useValue: mockAppRepo },
          { provide: getDataSourceToken(), useValue: mockDataSource },
        ],
      }).compile();
      const svc = module.get<ProvidersService>(ProvidersService);

      const dto = {
        name: 'gpt-4o',
        displayName: 'GPT-4o',
        contextWindow: 128000,
        maxOutput: 16384,
        capabilities: { streaming: true },
      };
      const result = await svc.createModel(mockProvider.id, TEST_USER_ID, dto);
      expect(result).toBeDefined();
      expect(result.name).toBe('gpt-4o');
      expect(result.isBuiltin).toBe(false);
    });

    it('should throw if provider not found', async () => {
      // Override the shared mock's findOneBy to return null for this test
      const localProviderRepo = {
        ...mockRepo,
        findOneBy: jest.fn().mockResolvedValue(null),
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ProvidersService,
          { provide: getRepositoryToken(ModelProvider), useValue: localProviderRepo },
          { provide: getRepositoryToken(ApiKey), useValue: mockApiKeyRepo },
          { provide: getRepositoryToken(Model), useValue: mockModelRepo },
          { provide: getRepositoryToken(App), useValue: mockAppRepo },
          { provide: getDataSourceToken(), useValue: mockDataSource },
        ],
      }).compile();
      const svc = module.get<ProvidersService>(ProvidersService);
      await expect(
        svc.createModel('nonexistent', TEST_USER_ID, { name: 'test', displayName: 'Test' })
      ).rejects.toThrow('Provider not found');
    });
  });

  describe('updateModel', () => {
    it('should update and return a model', async () => {
      const mockModel = {
        id: '770e8400-e29b-41d4-a716-446655440002',
        providerId: mockProvider.id,
        provider: { userId: TEST_USER_ID },
        name: 'gpt-4o',
        displayName: 'GPT-4o',
        contextWindow: 128000,
        maxOutput: 16384,
        capabilities: { streaming: true },
        isBuiltin: false,
      };
      const localModelRepo = {
        ...mockModelRepo,
        findOne: jest.fn().mockResolvedValue(mockModel),
        save: jest.fn().mockResolvedValue({ ...mockModel, displayName: 'GPT-4o Updated' }),
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ProvidersService,
          { provide: getRepositoryToken(ModelProvider), useValue: mockRepo },
          { provide: getRepositoryToken(ApiKey), useValue: mockApiKeyRepo },
          { provide: getRepositoryToken(Model), useValue: localModelRepo },
          { provide: getRepositoryToken(App), useValue: mockAppRepo },
          { provide: getDataSourceToken(), useValue: mockDataSource },
        ],
      }).compile();
      const svc = module.get<ProvidersService>(ProvidersService);

      const result = await svc.updateModel(
        '770e8400',
        { displayName: 'GPT-4o Updated' },
        TEST_USER_ID
      );
      expect(result.displayName).toBe('GPT-4o Updated');
    });

    it('should throw NotFoundException if model not found', async () => {
      const localModelRepo = {
        ...mockModelRepo,
        findOne: jest.fn().mockResolvedValue(null),
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ProvidersService,
          { provide: getRepositoryToken(ModelProvider), useValue: mockRepo },
          { provide: getRepositoryToken(ApiKey), useValue: mockApiKeyRepo },
          { provide: getRepositoryToken(Model), useValue: localModelRepo },
          { provide: getRepositoryToken(App), useValue: mockAppRepo },
          { provide: getDataSourceToken(), useValue: mockDataSource },
        ],
      }).compile();
      const svc = module.get<ProvidersService>(ProvidersService);
      await expect(svc.updateModel('nonexistent', { name: 'new' }, TEST_USER_ID)).rejects.toThrow(
        'Model not found'
      );
    });
  });

  describe('deleteModel', () => {
    const mockModelWithProvider = {
      id: '770e8400-e29b-41d4-a716-446655440002',
      providerId: mockProvider.id,
      provider: { userId: TEST_USER_ID },
    };
    const otherUserModel = {
      id: '880e8400-e29b-41d4-a716-446655440003',
      providerId: 'other-provider',
      provider: { userId: 'other-user' },
    };

    it('should delete a model owned by the user', async () => {
      const localModelRepo = {
        ...mockModelRepo,
        findOne: jest.fn().mockResolvedValue(mockModelWithProvider),
        delete: jest.fn().mockResolvedValue({ affected: 1, raw: {} }),
      };
      const localAppRepo = {
        ...mockAppRepo,
        count: jest.fn().mockResolvedValue(0),
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ProvidersService,
          { provide: getRepositoryToken(ModelProvider), useValue: mockRepo },
          { provide: getRepositoryToken(ApiKey), useValue: mockApiKeyRepo },
          { provide: getRepositoryToken(Model), useValue: localModelRepo },
          { provide: getRepositoryToken(App), useValue: localAppRepo },
          { provide: getDataSourceToken(), useValue: mockDataSource },
        ],
      }).compile();
      const svc = module.get<ProvidersService>(ProvidersService);

      await expect(svc.deleteModel(mockModelWithProvider.id, TEST_USER_ID)).resolves.not.toThrow();
      expect(localAppRepo.count).toHaveBeenCalledWith({
        where: { modelId: mockModelWithProvider.id },
      });
      expect(localModelRepo.delete).toHaveBeenCalledWith(mockModelWithProvider.id);
    });

    it('should throw NotFoundException if model not found', async () => {
      const localModelRepo = {
        ...mockModelRepo,
        findOne: jest.fn().mockResolvedValue(null),
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ProvidersService,
          { provide: getRepositoryToken(ModelProvider), useValue: mockRepo },
          { provide: getRepositoryToken(ApiKey), useValue: mockApiKeyRepo },
          { provide: getRepositoryToken(Model), useValue: localModelRepo },
          { provide: getRepositoryToken(App), useValue: mockAppRepo },
          { provide: getDataSourceToken(), useValue: mockDataSource },
        ],
      }).compile();
      const svc = module.get<ProvidersService>(ProvidersService);
      await expect(svc.deleteModel('nonexistent', TEST_USER_ID)).rejects.toThrow('Model not found');
    });

    it('should throw NotFoundException if model belongs to another user', async () => {
      const localModelRepo = {
        ...mockModelRepo,
        findOne: jest.fn().mockResolvedValue(otherUserModel),
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ProvidersService,
          { provide: getRepositoryToken(ModelProvider), useValue: mockRepo },
          { provide: getRepositoryToken(ApiKey), useValue: mockApiKeyRepo },
          { provide: getRepositoryToken(Model), useValue: localModelRepo },
          { provide: getRepositoryToken(App), useValue: mockAppRepo },
          { provide: getDataSourceToken(), useValue: mockDataSource },
        ],
      }).compile();
      const svc = module.get<ProvidersService>(ProvidersService);
      await expect(svc.deleteModel(otherUserModel.id, TEST_USER_ID)).rejects.toThrow(
        'Model not found'
      );
    });

    it('should throw BadRequestException if model is used by apps', async () => {
      const localModelRepo = {
        ...mockModelRepo,
        findOne: jest.fn().mockResolvedValue(mockModelWithProvider),
      };
      const localAppRepo = {
        ...mockAppRepo,
        count: jest.fn().mockResolvedValue(3),
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ProvidersService,
          { provide: getRepositoryToken(ModelProvider), useValue: mockRepo },
          { provide: getRepositoryToken(ApiKey), useValue: mockApiKeyRepo },
          { provide: getRepositoryToken(Model), useValue: localModelRepo },
          { provide: getRepositoryToken(App), useValue: localAppRepo },
          { provide: getDataSourceToken(), useValue: mockDataSource },
        ],
      }).compile();
      const svc = module.get<ProvidersService>(ProvidersService);
      await expect(svc.deleteModel(mockModelWithProvider.id, TEST_USER_ID)).rejects.toThrow(
        '该模型已被 3 个应用使用'
      );
    });
  });

  describe('findModels', () => {
    it('should return models for a provider scoped to user', async () => {
      mockRepo.findOneBy = jest.fn().mockResolvedValue(mockProvider);
      const result = await service.findModels(mockProvider.id, TEST_USER_ID);
      expect(result).toEqual([]);
    });

    it('should throw if provider not found', async () => {
      const localProviderRepo = {
        ...mockRepo,
        findOneBy: jest.fn().mockResolvedValue(null),
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ProvidersService,
          { provide: getRepositoryToken(ModelProvider), useValue: localProviderRepo },
          { provide: getRepositoryToken(ApiKey), useValue: mockApiKeyRepo },
          { provide: getRepositoryToken(Model), useValue: mockModelRepo },
          { provide: getRepositoryToken(App), useValue: mockAppRepo },
          { provide: getDataSourceToken(), useValue: mockDataSource },
        ],
      }).compile();
      const svc = module.get<ProvidersService>(ProvidersService);
      await expect(svc.findModels('nonexistent', TEST_USER_ID)).rejects.toThrow(
        'Provider not found'
      );
    });
  });

  describe('getProviderClient', () => {
    it('should return a provider client for openai type', async () => {
      jest.mocked(cryptoUtil.decrypt).mockReturnValue('sk-test');
      const result = await service.getProviderClient(mockProvider.id);
      expect(result).toBeDefined();
    });

    it('should throw if provider is disabled', async () => {
      const localRepo = {
        ...mockRepo,
        findOne: jest.fn().mockResolvedValue(null),
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ProvidersService,
          { provide: getRepositoryToken(ModelProvider), useValue: localRepo },
          { provide: getRepositoryToken(ApiKey), useValue: mockApiKeyRepo },
          { provide: getRepositoryToken(Model), useValue: mockModelRepo },
          { provide: getRepositoryToken(App), useValue: mockAppRepo },
          { provide: getDataSourceToken(), useValue: mockDataSource },
        ],
      }).compile();
      const svc = module.get<ProvidersService>(ProvidersService);
      await expect(svc.getProviderClient('nonexistent')).rejects.toThrow(
        'No enabled provider found'
      );
    });

    it('should throw for non-local provider without API keys', async () => {
      const noKeyProvider = {
        ...mockProvider,
        apiKeys: [],
      };
      const localRepo = {
        ...mockRepo,
        findOne: jest.fn().mockResolvedValue(noKeyProvider),
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ProvidersService,
          { provide: getRepositoryToken(ModelProvider), useValue: localRepo },
          { provide: getRepositoryToken(ApiKey), useValue: mockApiKeyRepo },
          { provide: getRepositoryToken(Model), useValue: mockModelRepo },
          { provide: getRepositoryToken(App), useValue: mockAppRepo },
          { provide: getDataSourceToken(), useValue: mockDataSource },
        ],
      }).compile();
      const svc = module.get<ProvidersService>(ProvidersService);
      await expect(svc.getProviderClient(mockProvider.id)).rejects.toThrow('No API key found');
    });

    it('should allow local provider (ollama) without API keys', async () => {
      const ollamaProvider = {
        ...mockProvider,
        id: 'ollama-provider-id',
        name: 'Ollama',
        type: 'ollama' as const,
        apiKeys: [],
      };
      const localRepo = {
        ...mockRepo,
        findOne: jest.fn().mockResolvedValue(ollamaProvider),
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ProvidersService,
          { provide: getRepositoryToken(ModelProvider), useValue: localRepo },
          { provide: getRepositoryToken(ApiKey), useValue: mockApiKeyRepo },
          { provide: getRepositoryToken(Model), useValue: mockModelRepo },
          { provide: getRepositoryToken(App), useValue: mockAppRepo },
          { provide: getDataSourceToken(), useValue: mockDataSource },
        ],
      }).compile();
      const svc = module.get<ProvidersService>(ProvidersService);
      const result = await svc.getProviderClient('ollama-provider-id');
      expect(result).toBeDefined();
    });

    it('should allow local provider (langchain-ollama) without API keys', async () => {
      const langchainOllamaProvider = {
        ...mockProvider,
        id: 'langchain-ollama-provider-id',
        name: 'LangChain Ollama',
        type: 'langchain-ollama' as const,
        apiKeys: [],
      };
      const localRepo = {
        ...mockRepo,
        findOne: jest.fn().mockResolvedValue(langchainOllamaProvider),
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ProvidersService,
          { provide: getRepositoryToken(ModelProvider), useValue: localRepo },
          { provide: getRepositoryToken(ApiKey), useValue: mockApiKeyRepo },
          { provide: getRepositoryToken(Model), useValue: mockModelRepo },
          { provide: getRepositoryToken(App), useValue: mockAppRepo },
          { provide: getDataSourceToken(), useValue: mockDataSource },
        ],
      }).compile();
      const svc = module.get<ProvidersService>(ProvidersService);
      const result = await svc.getProviderClient('langchain-ollama-provider-id');
      expect(result).toBeDefined();
    });
  });
});
