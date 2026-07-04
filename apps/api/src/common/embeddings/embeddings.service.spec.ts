import { Test, TestingModule } from '@nestjs/testing';
import { EmbeddingsService } from './embeddings.service';

describe('EmbeddingsService', () => {
  let service: EmbeddingsService;

  const mockEmbeddings = {
    embedDocuments: jest.fn().mockResolvedValue([
      [0.1, 0.2],
      [0.3, 0.4],
    ]),
    embedQuery: jest.fn().mockResolvedValue([0.5, 0.6]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: EmbeddingsService,
          useFactory: () => {
            const svc = new EmbeddingsService();
            svc.setEmbeddings(mockEmbeddings as any);
            return svc;
          },
        },
      ],
    }).compile();

    service = module.get<EmbeddingsService>(EmbeddingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should embed documents', async () => {
    const result = await service.embedDocuments(['text1', 'text2']);
    expect(result).toEqual([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
  });

  it('should embed a query', async () => {
    const result = await service.embedQuery('test query');
    expect(result).toEqual([0.5, 0.6]);
  });
});
