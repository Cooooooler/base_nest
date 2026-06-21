import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { lastValueFrom, of } from 'rxjs';
import { RetrievalService } from '../knowledge/retrieval.service';
import { ProvidersService } from '../providers/providers.service';
import { AppService } from './app.service';
import { ChatService } from './chat.service';
import { ConversationService } from './conversation.service';
import { Message } from './entities/message.entity';

describe('ChatService', () => {
  let service: ChatService;

  const mockMessageRepo = {
    find: jest.fn().mockResolvedValue([]),
    save: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'msg-1', ...data })),
    create: jest.fn().mockImplementation((data) => data),
  };

  const mockAppService = {
    findOne: jest.fn().mockResolvedValue({
      id: 'app-1',
      providerId: 'prov-1',
      modelId: 'model-1',
      model: { name: 'gpt-4o' },
      systemPrompt: 'You are a helper',
      temperature: 0.7,
      maxTokens: 4096,
    }),
  };

  const mockConvService = {
    findOne: jest.fn().mockResolvedValue({ id: 'conv-1', appId: 'app-1' }),
  };

  const mockProvidersService = {
    getProviderClient: jest.fn().mockResolvedValue({
      chatStream: jest
        .fn()
        .mockReturnValue(
          of(
            { content: 'Hello', isEnd: false },
            { content: ' world', isEnd: false },
            { content: '', isEnd: true }
          )
        ),
    }),
  };

  const mockRetrievalService = {
    searchWithScore: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getRepositoryToken(Message), useValue: mockMessageRepo },
        { provide: AppService, useValue: mockAppService },
        { provide: ConversationService, useValue: mockConvService },
        { provide: ProvidersService, useValue: mockProvidersService },
        { provide: RetrievalService, useValue: mockRetrievalService },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('sendMessage should return an Observable and save messages', async () => {
    const result$ = await service.sendMessage('app-1', 'conv-1', 'Hi', 'user-1');

    const chunks: any[] = [];
    result$.subscribe({
      next: (chunk) => chunks.push(chunk),
    });

    await lastValueFrom(result$);

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[chunks.length - 1].isEnd).toBe(true);
    expect(mockMessageRepo.save).toHaveBeenCalled();
  });
});
