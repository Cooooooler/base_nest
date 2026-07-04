import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EmbeddingFactory } from '../common/embeddings/embedding-factory.service';
import { ChromaVectorStoreService } from '../common/vectore-store/chroma-vector-store.service';
import { KnowledgeBase } from './entities/knowledge-base.entity';
import { RetrievalService } from './retrieval.service';

describe('RetrievalService', () => {
  let service: RetrievalService;

  const mockVectorStore = {
    similaritySearch: jest.fn(),
    similaritySearchWithScore: jest.fn(),
  };

  const mockEmbeddingFactory = {
    create: jest.fn().mockReturnValue({}),
  };

  const mockKbRepo = {
    findOneBy: jest.fn().mockResolvedValue({ id: 'kb-1', embeddingModel: 'mxbai-embed-large' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetrievalService,
        { provide: ChromaVectorStoreService, useValue: mockVectorStore },
        { provide: EmbeddingFactory, useValue: mockEmbeddingFactory },
        { provide: getRepositoryToken(KnowledgeBase), useValue: mockKbRepo },
      ],
    }).compile();

    service = module.get<RetrievalService>(RetrievalService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('searchForUser', () => {
    it('should return search results', async () => {
      mockVectorStore.similaritySearch.mockResolvedValue([
        { pageContent: 'result content', metadata: { fileName: 'doc.txt' } },
      ]);

      const results = await service.searchForUser('kb-1', 'user-1', 'test query', 5);

      expect(results).toHaveLength(1);
      expect(results[0].content).toBe('result content');
      expect(mockVectorStore.similaritySearch).toHaveBeenCalledWith(
        'test query',
        5,
        expect.any(Object)
      );
    });

    it('should use default topK of 4', async () => {
      mockVectorStore.similaritySearch.mockResolvedValue([]);
      await service.searchForUser('kb-1', 'user-1', 'query');

      expect(mockVectorStore.similaritySearch).toHaveBeenCalledWith('query', 4, expect.any(Object));
    });
  });

  describe('searchWithScore', () => {
    it('should return results with scores', async () => {
      mockVectorStore.similaritySearchWithScore.mockResolvedValue([
        [{ pageContent: 'content', metadata: {} }, 0.15],
        [{ pageContent: 'content2', metadata: {} }, 0.35],
      ]);

      const results = await service.searchWithScore('kb-1', 'test query', 3);

      expect(results).toHaveLength(2);
      expect(results[0].score).toBeCloseTo(0.85);
      expect(results[1].score).toBeCloseTo(0.65);
    });
  });
});
