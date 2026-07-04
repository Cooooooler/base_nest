import { Test, TestingModule } from '@nestjs/testing';
import { EmbeddingFactory } from './embedding-factory.service';

describe('EmbeddingFactory', () => {
  let factory: EmbeddingFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: EmbeddingFactory,
          useFactory: () => new EmbeddingFactory('http://localhost:11434'),
        },
      ],
    }).compile();

    factory = module.get<EmbeddingFactory>(EmbeddingFactory);
  });

  it('should be defined', () => {
    expect(factory).toBeDefined();
  });

  it('should create embeddings with model name', () => {
    const embeddings = factory.create('mxbai-embed-large');
    expect(embeddings).toBeDefined();
    expect(embeddings.model).toBe('mxbai-embed-large');
  });
});
