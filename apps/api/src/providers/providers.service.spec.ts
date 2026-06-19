import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as cryptoUtil from '../common/crypto.util';
import { ApiKey } from './entities/api-key.entity';
import { ModelProvider } from './entities/model-provider.entity';
import { Model } from './entities/model.entity';
import { ProvidersService } from './providers.service';

jest.mock('../common/crypto.util');

describe('ProvidersService', () => {
  let service: ProvidersService;

  const mockProvider: ModelProvider = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'OpenAI',
    type: 'openai',
    isEnabled: true,
    baseUrl: null,
    createdAt: new Date(),
    apiKeys: [],
    models: [],
  };

  const mockProviderWithKeys: ModelProvider = {
    ...mockProvider,
    apiKeys: [
      {
        id: '660e8400-e29b-41d4-a716-446655440001',
        providerId: mockProvider.id,
        name: 'Production Key',
        encryptedKey: 'encrypted:value',
        maskedKey: 'sk-t****xxx',
        isActive: true,
        createdAt: new Date(),
        provider: null as any,
      },
    ],
  };

  const mockApiKey: ApiKey = {
    id: '660e8400-e29b-41d4-a716-446655440001',
    providerId: mockProvider.id,
    name: 'Production Key',
    encryptedKey: 'encrypted:value',
    maskedKey: 'sk-t****xxx',
    isActive: true,
    createdAt: new Date(),
    provider: null as any,
  };

  const mockRepo = {
    find: jest.fn().mockResolvedValue([mockProvider]),
    findOneBy: jest.fn().mockResolvedValue(mockProvider),
    findOne: jest.fn().mockImplementation((opts: any) => {
      if (opts?.where?.isEnabled) {
        return mockProviderWithKeys;
      }
      if (opts?.relations) {
        return mockProvider;
      }
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
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn().mockResolvedValue({ affected: 0, raw: {} }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProvidersService,
        { provide: getRepositoryToken(ModelProvider), useValue: mockRepo },
        { provide: getRepositoryToken(ApiKey), useValue: mockApiKeyRepo },
        { provide: getRepositoryToken(Model), useValue: mockModelRepo },
      ],
    }).compile();

    service = module.get<ProvidersService>(ProvidersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllProviders', () => {
    it('should return all providers with relations', async () => {
      const result = await service.findAllProviders();
      expect(result).toEqual([mockProvider]);
    });
  });

  describe('findProviderById', () => {
    it('should return a provider by id', async () => {
      const result = await service.findProviderById(mockProvider.id);
      expect(result).toEqual(mockProvider);
    });
  });

  describe('createProvider', () => {
    it('should create and return a provider', async () => {
      const dto = { name: 'OpenAI', type: 'openai' as const };
      const result = await service.createProvider(dto);
      expect(result).toEqual(mockProvider);
    });
  });

  describe('updateProvider', () => {
    const dto = { name: 'OpenAI Updated' };

    it('should update and return a provider', async () => {
      const result = await service.updateProvider(mockProvider.id, dto);
      expect(result).toEqual(mockProvider);
    });

    it('should throw NotFoundException if provider not found', async () => {
      const localRepo = { ...mockRepo, findOneBy: jest.fn().mockResolvedValue(null) };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ProvidersService,
          { provide: getRepositoryToken(ModelProvider), useValue: localRepo },
          { provide: getRepositoryToken(ApiKey), useValue: mockApiKeyRepo },
          { provide: getRepositoryToken(Model), useValue: mockModelRepo },
        ],
      }).compile();
      const svc = module.get<ProvidersService>(ProvidersService);
      await expect(svc.updateProvider('nonexistent', dto)).rejects.toThrow('Provider not found');
    });
  });

  describe('deleteProvider', () => {
    it('should delete a provider', async () => {
      await service.deleteProvider(mockProvider.id);
    });
  });

  describe('findApiKeys', () => {
    it('should return API keys for a provider', async () => {
      const result = await service.findApiKeys(mockProvider.id);
      expect(result).toEqual([mockApiKey]);
    });
  });

  describe('createApiKey', () => {
    it('should encrypt and save an API key', async () => {
      (cryptoUtil.encrypt as jest.Mock).mockReturnValue('encrypted:value');
      const dto = { name: 'Production', apiKey: 'sk-proj-xxx' };
      const result = await service.createApiKey(mockProvider.id, dto);
      expect(result.maskedKey).toBeDefined();
      expect(result.maskedKey).not.toContain('sk-proj');
    });

    it('should throw if provider not found', async () => {
      const localRepo = { ...mockRepo, findOneBy: jest.fn().mockResolvedValue(null) };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ProvidersService,
          { provide: getRepositoryToken(ModelProvider), useValue: localRepo },
          { provide: getRepositoryToken(ApiKey), useValue: mockApiKeyRepo },
          { provide: getRepositoryToken(Model), useValue: mockModelRepo },
        ],
      }).compile();
      const svc = module.get<ProvidersService>(ProvidersService);
      await expect(
        svc.createApiKey('nonexistent', { name: 'test', apiKey: 'key' })
      ).rejects.toThrow('Provider not found');
    });
  });

  describe('deleteApiKey', () => {
    it('should delete an API key', async () => {
      await service.deleteApiKey(mockApiKey.id);
    });
  });

  describe('createModel', () => {
    it('should create and return a model', async () => {
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
      const result = await svc.createModel(mockProvider.id, dto);
      expect(result).toBeDefined();
      expect(result.name).toBe('gpt-4o');
      expect(result.isBuiltin).toBe(false);
    });

    it('should throw if provider not found', async () => {
      const localRepo = { ...mockRepo, findOneBy: jest.fn().mockResolvedValue(null) };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ProvidersService,
          { provide: getRepositoryToken(ModelProvider), useValue: localRepo },
          { provide: getRepositoryToken(ApiKey), useValue: mockApiKeyRepo },
          { provide: getRepositoryToken(Model), useValue: mockModelRepo },
        ],
      }).compile();
      const svc = module.get<ProvidersService>(ProvidersService);
      await expect(
        svc.createModel('nonexistent', { name: 'test', displayName: 'Test' })
      ).rejects.toThrow('Provider not found');
    });
  });

  describe('updateModel', () => {
    it('should update and return a model', async () => {
      const mockModel = {
        id: '770e8400-e29b-41d4-a716-446655440002',
        providerId: mockProvider.id,
        name: 'gpt-4o',
        displayName: 'GPT-4o',
        contextWindow: 128000,
        maxOutput: 16384,
        capabilities: { streaming: true },
        isBuiltin: false,
      };
      const localModelRepo = {
        ...mockModelRepo,
        findOneBy: jest.fn().mockResolvedValue(mockModel),
        save: jest.fn().mockResolvedValue({ ...mockModel, displayName: 'GPT-4o Updated' }),
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ProvidersService,
          { provide: getRepositoryToken(ModelProvider), useValue: mockRepo },
          { provide: getRepositoryToken(ApiKey), useValue: mockApiKeyRepo },
          { provide: getRepositoryToken(Model), useValue: localModelRepo },
        ],
      }).compile();
      const svc = module.get<ProvidersService>(ProvidersService);

      const result = await svc.updateModel('770e8400', { displayName: 'GPT-4o Updated' });
      expect(result.displayName).toBe('GPT-4o Updated');
    });

    it('should throw NotFoundException if model not found', async () => {
      const localModelRepo = {
        ...mockModelRepo,
        findOneBy: jest.fn().mockResolvedValue(null),
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ProvidersService,
          { provide: getRepositoryToken(ModelProvider), useValue: mockRepo },
          { provide: getRepositoryToken(ApiKey), useValue: mockApiKeyRepo },
          { provide: getRepositoryToken(Model), useValue: localModelRepo },
        ],
      }).compile();
      const svc = module.get<ProvidersService>(ProvidersService);
      await expect(svc.updateModel('nonexistent', { name: 'new' })).rejects.toThrow(
        'Model not found'
      );
    });
  });

  describe('deleteModel', () => {
    it('should delete a model', async () => {
      const localModelRepo = {
        ...mockModelRepo,
        delete: jest.fn().mockResolvedValue({ affected: 1, raw: {} }),
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ProvidersService,
          { provide: getRepositoryToken(ModelProvider), useValue: mockRepo },
          { provide: getRepositoryToken(ApiKey), useValue: mockApiKeyRepo },
          { provide: getRepositoryToken(Model), useValue: localModelRepo },
        ],
      }).compile();
      const svc = module.get<ProvidersService>(ProvidersService);

      await expect(svc.deleteModel('770e8400')).resolves.not.toThrow();
    });

    it('should throw NotFoundException if model not found', async () => {
      const localModelRepo = {
        ...mockModelRepo,
        delete: jest.fn().mockResolvedValue({ affected: 0, raw: {} }),
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ProvidersService,
          { provide: getRepositoryToken(ModelProvider), useValue: mockRepo },
          { provide: getRepositoryToken(ApiKey), useValue: mockApiKeyRepo },
          { provide: getRepositoryToken(Model), useValue: localModelRepo },
        ],
      }).compile();
      const svc = module.get<ProvidersService>(ProvidersService);
      await expect(svc.deleteModel('nonexistent')).rejects.toThrow('Model not found');
    });
  });

  describe('findModels', () => {
    it('should return models for a provider', async () => {
      const result = await service.findModels(mockProvider.id);
      expect(result).toEqual([]);
    });
  });

  describe('getProviderClient', () => {
    it('should return a provider client for openai type', async () => {
      (cryptoUtil.decrypt as jest.Mock).mockReturnValue('sk-test');
      const result = await service.getProviderClient(mockProvider.id);
      expect(result).toBeDefined();
    });
  });
});
