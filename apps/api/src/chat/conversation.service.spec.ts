import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationService } from './conversation.service';
import { Conversation } from './entities/conversation.entity';

describe('ConversationService', () => {
  let service: ConversationService;
  let repo: Repository<Conversation>;

  const mockConv: Conversation = {
    id: 'conv-1',
    appId: 'app-1',
    title: 'Test',
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Conversation;

  const mockRepo = {
    find: jest.fn().mockResolvedValue([mockConv]),
    findOneBy: jest.fn().mockResolvedValue(mockConv),
    create: jest.fn().mockReturnValue(mockConv),
    save: jest.fn().mockResolvedValue(mockConv),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        { provide: getRepositoryToken(Conversation), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<ConversationService>(ConversationService);
    repo = module.get(getRepositoryToken(Conversation));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findByApp should return conversations', async () => {
    const result = await service.findByApp('app-1', 'user-1');
    expect(result).toEqual([mockConv]);
    expect(mockRepo.find).toHaveBeenCalledWith({
      where: { appId: 'app-1', userId: 'user-1' },
      order: { updatedAt: 'DESC' },
    });
  });

  it('findOne should return a conversation', async () => {
    const result = await service.findOne('conv-1');
    expect(result).toEqual(mockConv);
  });

  it('create should create a conversation', async () => {
    const result = await service.create('app-1', 'user-1', { title: 'Test' });
    expect(result).toEqual(mockConv);
    expect(mockRepo.create).toHaveBeenCalledWith({
      appId: 'app-1',
      userId: 'user-1',
      title: 'Test',
    });
  });

  it('delete should remove a conversation', async () => {
    await service.delete('conv-1');
    expect(mockRepo.delete).toHaveBeenCalledWith('conv-1');
  });
});
