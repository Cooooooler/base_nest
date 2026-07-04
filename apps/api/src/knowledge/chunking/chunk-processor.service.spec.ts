import { Test, TestingModule } from '@nestjs/testing';
import { ChunkProcessorService } from './chunk-processor.service';

describe('ChunkProcessorService', () => {
  let service: ChunkProcessorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChunkProcessorService],
    }).compile();

    service = module.get<ChunkProcessorService>(ChunkProcessorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('chunkText', () => {
    it('should split text into chunks', async () => {
      const text = 'Hello world. '.repeat(200);
      const chunks = await service.chunkText(text, { chunkSize: 100, chunkOverlap: 20 });

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]).toHaveProperty('content');
      expect(chunks[0]).toHaveProperty('index', 0);
      expect(chunks[0]).toHaveProperty('charCount');
      expect(chunks[0]).toHaveProperty('metadata');
    });

    it('should use default options when not provided', async () => {
      const text = 'A short text.';
      const chunks = await service.chunkText(text);

      expect(chunks.length).toBe(1);
      expect(chunks[0].content).toBe(text);
    });
  });

  describe('chunkPdf', () => {
    it('should delegate to chunkText', async () => {
      const text = 'PDF extracted text';
      const chunks = await service.chunkPdf(text, { chunkSize: 200 });

      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toBe(text);
    });
  });
});
