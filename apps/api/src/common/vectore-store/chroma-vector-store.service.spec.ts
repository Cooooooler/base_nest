import { Embeddings } from '@langchain/core/embeddings';
import { Test, TestingModule } from '@nestjs/testing';
import { fromPartial } from '@total-typescript/shoehorn';
import { ChromaVectorStoreService } from './chroma-vector-store.service';

describe('ChromaVectorStoreService', () => {
  let service: ChromaVectorStoreService;

  const mockDefaultEmbeddings = fromPartial<Embeddings<number[]>>({
    embedDocuments: jest.fn().mockResolvedValue([[0.1, 0.2]]),
    embedQuery: jest.fn().mockResolvedValue([0.1, 0.2]),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ChromaVectorStoreService,
          useFactory: () =>
            new ChromaVectorStoreService(mockDefaultEmbeddings, {
              collectionName: 'test_collection',
              url: 'http://localhost:8000',
              numDimensions: 1024,
            }),
        },
      ],
    }).compile();

    service = module.get<ChromaVectorStoreService>(ChromaVectorStoreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getCollectionName should return the collection name', () => {
    expect(service.getCollectionName()).toBe('test_collection');
  });
});
