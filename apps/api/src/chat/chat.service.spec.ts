import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { lastValueFrom, Observable, of } from 'rxjs';
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
    updateTitleIfEmpty: jest.fn().mockResolvedValue(undefined),
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
    const result$ = await service.sendMessage('app-1', 'conv-1', 'Hi');

    const chunks: any[] = [];
    result$.subscribe({
      next: (chunk) => chunks.push(chunk),
    });

    await lastValueFrom(result$);

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[chunks.length - 1].isEnd).toBe(true);
    expect(mockMessageRepo.save).toHaveBeenCalled();
  });

  it('should throw NotFoundException if conversation does not belong to app', async () => {
    const wrongConvService = {
      findOne: jest.fn().mockResolvedValue({ id: 'conv-1', appId: 'other-app' }),
    };
    const module = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getRepositoryToken(Message), useValue: mockMessageRepo },
        { provide: AppService, useValue: mockAppService },
        { provide: ConversationService, useValue: wrongConvService },
        { provide: ProvidersService, useValue: mockProvidersService },
        { provide: RetrievalService, useValue: mockRetrievalService },
      ],
    }).compile();
    const svc = module.get<ChatService>(ChatService);
    await expect(svc.sendMessage('app-1', 'conv-1', 'Hi')).rejects.toThrow(
      'Conversation not found'
    );
  });

  it('should include knowledge base sources if app has knowledgeBaseId', async () => {
    const appWithKB = {
      id: 'app-1',
      providerId: 'prov-1',
      modelId: 'model-1',
      model: { name: 'gpt-4o' },
      systemPrompt: 'You are a helper',
      temperature: 0.7,
      maxTokens: 4096,
      knowledgeBaseId: 'kb-1',
    };
    const appServiceWithKB = {
      findOne: jest.fn().mockResolvedValue(appWithKB),
    };
    const retrievalWithResults = {
      searchWithScore: jest
        .fn()
        .mockResolvedValue([
          { content: 'source1', metadata: { fileName: 'doc1.txt' }, score: 0.95 },
        ]),
    };
    const module = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getRepositoryToken(Message), useValue: mockMessageRepo },
        { provide: AppService, useValue: appServiceWithKB },
        { provide: ConversationService, useValue: mockConvService },
        { provide: ProvidersService, useValue: mockProvidersService },
        { provide: RetrievalService, useValue: retrievalWithResults },
      ],
    }).compile();
    const svc = module.get<ChatService>(ChatService);
    const result$ = await svc.sendMessage('app-1', 'conv-1', 'query about docs');

    const chunks: any[] = [];
    result$.subscribe({ next: (c: any) => chunks.push(c) });
    await lastValueFrom(result$);

    // The last chunk should contain sources
    const lastChunk = chunks[chunks.length - 1];
    expect(lastChunk.sources).toBeDefined();
    expect(lastChunk.sources).toHaveLength(1);
  });

  it('should handle knowledge retrieval failure gracefully', async () => {
    const appWithKB = {
      id: 'app-1',
      providerId: 'prov-1',
      modelId: 'model-1',
      model: { name: 'gpt-4o' },
      systemPrompt: 'You are a helper',
      temperature: 0.7,
      maxTokens: 4096,
      knowledgeBaseId: 'kb-1',
    };
    const appServiceWithKB = {
      findOne: jest.fn().mockResolvedValue(appWithKB),
    };
    const failingRetrieval = {
      searchWithScore: jest.fn().mockRejectedValue(new Error('ChromaDB down')),
    };
    const module = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getRepositoryToken(Message), useValue: mockMessageRepo },
        { provide: AppService, useValue: appServiceWithKB },
        { provide: ConversationService, useValue: mockConvService },
        { provide: ProvidersService, useValue: mockProvidersService },
        { provide: RetrievalService, useValue: failingRetrieval },
      ],
    }).compile();
    const svc = module.get<ChatService>(ChatService);
    const result$ = await svc.sendMessage('app-1', 'conv-1', 'query');

    const chunks: any[] = [];
    result$.subscribe({ next: (c: any) => chunks.push(c) });
    await lastValueFrom(result$);

    expect(chunks.length).toBeGreaterThan(0);
  });

  it('should handle chat stream error', async () => {
    const errorProviders = {
      getProviderClient: jest.fn().mockResolvedValue({
        chatStream: jest.fn().mockReturnValue(
          new Observable((sub: any) => {
            sub.error(new Error('API quota exceeded'));
          })
        ),
      }),
    };
    const module = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getRepositoryToken(Message), useValue: mockMessageRepo },
        { provide: AppService, useValue: mockAppService },
        { provide: ConversationService, useValue: mockConvService },
        { provide: ProvidersService, useValue: errorProviders },
        { provide: RetrievalService, useValue: mockRetrievalService },
      ],
    }).compile();
    const svc = module.get<ChatService>(ChatService);
    const result$ = await svc.sendMessage('app-1', 'conv-1', 'Hi');

    const chunks: any[] = [];
    result$.subscribe({ next: (c: any) => chunks.push(c) });
    await lastValueFrom(result$);

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.some((c: any) => c.isEnd && c.error)).toBe(true);
  });

  it('renderPrompt should replace template variables', () => {
    const result = service.renderPrompt('Hello {{name}}, today is {{date}}', {
      name: 'Alice',
      date: '2024-01-01',
    });
    expect(result).toBe('Hello Alice, today is 2024-01-01');
  });

  it('renderPrompt should leave unknown variables unchanged', () => {
    const result = service.renderPrompt('Hello {{name}}, {{unknown}}', { name: 'Bob' });
    expect(result).toBe('Hello Bob, {{unknown}}');
  });

  it('should fallback content from reasoning when content is empty', async () => {
    // Fresh mock for reasoning test
    const reasoningRepo = {
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'msg-2', ...data })),
      create: jest.fn().mockImplementation((data) => data),
    };
    const reasoningProviders = {
      getProviderClient: jest.fn().mockResolvedValue({
        chatStream: jest
          .fn()
          .mockReturnValue(
            of(
              { content: '', reasoning: 'Step 1: Analyze the problem...\n', isEnd: false },
              { content: '', reasoning: 'Step 2: Think about edge cases...\n', isEnd: false },
              { content: '', reasoning: 'The answer is 42.', isEnd: true }
            )
          ),
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getRepositoryToken(Message), useValue: reasoningRepo },
        { provide: AppService, useValue: mockAppService },
        { provide: ConversationService, useValue: mockConvService },
        { provide: ProvidersService, useValue: reasoningProviders },
        { provide: RetrievalService, useValue: mockRetrievalService },
      ],
    }).compile();

    const svc = module.get<ChatService>(ChatService);
    const result$ = await svc.sendMessage('app-1', 'conv-1', 'question');
    await lastValueFrom(result$);

    const savedCall = reasoningRepo.save.mock.calls.find(
      (call: any[]) => call[0]?.role === 'assistant'
    );
    const savedMsg = savedCall ? savedCall[0] : null;
    expect(savedMsg).toBeDefined();
    expect(savedMsg.content).toBe('The answer is 42.');
  });
});
