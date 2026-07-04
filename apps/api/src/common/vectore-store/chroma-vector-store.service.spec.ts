import { Test, TestingModule } from '@nestjs/testing';
import { ChromaVectorStoreService } from './chroma-vector-store.service';

describe('ChromaVectorStoreService', () => {
  let service: ChromaVectorStoreService;

  const mockDefaultEmbeddings = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ChromaVectorStoreService,
          useFactory: () =>
            new ChromaVectorStoreService(mockDefaultEmbeddings as any, {
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
