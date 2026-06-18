import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppService } from './app.service';
import { App } from './entities/app.entity';

describe('AppService', () => {
  let service: AppService;
  let repo: Repository<App>;

  const mockApp: App = {
    id: 'app-1',
    name: 'Test App',
    description: null,
    providerId: 'prov-1',
    modelId: 'model-1',
    systemPrompt: '',
    temperature: 0.7,
    maxTokens: 4096,
    userId: 'user-1',
    isPublished: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as App;

  const mockRepo = {
    find: jest.fn().mockResolvedValue([mockApp]),
    findOne: jest.fn().mockResolvedValue(mockApp),
    findOneBy: jest.fn().mockResolvedValue(mockApp),
    create: jest.fn().mockReturnValue(mockApp),
    save: jest.fn().mockResolvedValue(mockApp),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppService, { provide: getRepositoryToken(App), useValue: mockRepo }],
    }).compile();

    service = module.get<AppService>(AppService);
    repo = module.get(getRepositoryToken(App));
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

  it('create should create and return an app', async () => {
    const dto = { name: 'Test App', providerId: 'prov-1', modelId: 'model-1' };
    const result = await service.create('user-1', dto);
    expect(result).toEqual(mockApp);
    expect(mockRepo.create).toHaveBeenCalled();
    expect(mockRepo.save).toHaveBeenCalled();
  });

  it('update should update an app', async () => {
    const dto = { name: 'Updated' };
    const result = await service.update('app-1', dto);
    expect(result).toEqual(mockApp);
    expect(mockRepo.update).toHaveBeenCalledWith('app-1', dto);
  });

  it('delete should remove an app', async () => {
    await service.delete('app-1');
    expect(mockRepo.delete).toHaveBeenCalledWith('app-1');
  });
});
