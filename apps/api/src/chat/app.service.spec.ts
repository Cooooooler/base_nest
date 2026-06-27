import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ModelProvider } from '../providers/entities/model-provider.entity';
import { Model } from '../providers/entities/model.entity';
import { AppService } from './app.service';
import { App } from './entities/app.entity';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

describe('AppService', () => {
  let service: AppService;

  const mockApp: Partial<App> = {
    id: 'app-1',
    name: 'Test App',
    description: null as string | null,
    providerId: 'prov-1',
    modelId: 'model-1',
    systemPrompt: '',
    temperature: 0.7,
    maxTokens: 4096,
    knowledgeBaseId: null as string | null,
    userId: 'user-1',
    isPublished: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProvider: Partial<ModelProvider> = {
    id: 'prov-1',
    userId: 'user-1',
    name: 'Test Provider',
    type: 'openai',
    isEnabled: true,
    baseUrl: null,
    createdAt: new Date(),
    apiKeys: [],
    models: [],
  };

  const mockModel: Partial<Model> = {
    id: 'model-1',
    providerId: 'prov-1',
    name: 'gpt-4',
    displayName: 'GPT-4',
    contextWindow: 8192,
    maxOutput: 4096,
    capabilities: {},
    isBuiltin: false,
    createdAt: new Date(),
  };

  const mockRepo = {
    find: jest.fn().mockResolvedValue([mockApp]),
    findOne: jest.fn().mockResolvedValue(mockApp),
    findOneBy: jest.fn().mockResolvedValue(mockApp),
    create: jest.fn().mockReturnValue(mockApp),
    save: jest.fn().mockResolvedValue(mockApp),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockConvRepo = {
    find: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue({ affected: 0 }),
  };

  const mockMessageRepo = {
    delete: jest.fn().mockResolvedValue({ affected: 0 }),
  };

  const mockProviderRepo = {
    findOneBy: jest.fn().mockResolvedValue(mockProvider),
  };

  const mockModelRepo = {
    findOneBy: jest.fn().mockResolvedValue(mockModel),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        { provide: getRepositoryToken(App), useValue: mockRepo },
        { provide: getRepositoryToken(Conversation), useValue: mockConvRepo },
        { provide: getRepositoryToken(Message), useValue: mockMessageRepo },
        { provide: getRepositoryToken(ModelProvider), useValue: mockProviderRepo },
        { provide: getRepositoryToken(Model), useValue: mockModelRepo },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findAllByUser should return apps for a user', async () => {
    const result = await service.findAllByUser('user-1');
    expect(result).toEqual([mockApp]);
    expect(mockRepo.find).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      order: { createdAt: 'DESC' },
    });
  });

  it('findOne should return an app', async () => {
    const result = await service.findOne('app-1');
    expect(result).toEqual(mockApp);
    expect(mockRepo.findOne).toHaveBeenCalledWith({
      where: { id: 'app-1' },
      relations: { provider: true, model: true },
    });
  });

  it('create should verify ownership and create an app', async () => {
    const dto = { name: 'Test App', providerId: 'prov-1', modelId: 'model-1' };
    const result = await service.create('user-1', dto);
    expect(result).toEqual(mockApp);
    expect(mockProviderRepo.findOneBy).toHaveBeenCalledWith({ id: 'prov-1', userId: 'user-1' });
    expect(mockModelRepo.findOneBy).toHaveBeenCalledWith({ id: 'model-1', providerId: 'prov-1' });
    expect(mockRepo.create).toHaveBeenCalled();
    expect(mockRepo.save).toHaveBeenCalled();
  });

  it('create should throw if provider not owned by user', async () => {
    mockProviderRepo.findOneBy = jest.fn().mockResolvedValue(null);
    const dto = { name: 'Test App', providerId: 'prov-1', modelId: 'model-1' };
    await expect(service.create('user-2', dto)).rejects.toThrow('Provider not found');
  });

  it('update should update an app', async () => {
    const dto = { name: 'Updated' };
    const result = await service.update('app-1', 'user-1', dto);
    expect(result).toEqual(mockApp);
    expect(mockRepo.update).toHaveBeenCalledWith('app-1', dto);
  });

  it('update should verify provider ownership if providerId changes', async () => {
    mockProviderRepo.findOneBy = jest.fn().mockResolvedValue(mockProvider);
    mockModelRepo.findOneBy = jest.fn().mockResolvedValue(mockModel);
    const dto = { providerId: 'prov-1', modelId: 'model-1' };
    await service.update('app-1', 'user-1', dto);
    expect(mockProviderRepo.findOneBy).toHaveBeenCalledWith({ id: 'prov-1', userId: 'user-1' });
    expect(mockModelRepo.findOneBy).toHaveBeenCalledWith({ id: 'model-1', providerId: 'prov-1' });
  });

  it('delete should remove an app', async () => {
    await service.delete('app-1');
    expect(mockRepo.delete).toHaveBeenCalledWith('app-1');
  });
});
