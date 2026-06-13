import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { KnowledgeBase } from './entities/knowledge-base.entity';
import { KnowledgeService } from './knowledge.service';

describe('KnowledgeService', () => {
  let service: KnowledgeService;

  const mockKb: KnowledgeBase = {
    id: 'uuid-1',
    name: 'Test KB',
    description: null,
    embeddingModel: 'mxbai-embed-large',
    chunkStrategy: 'recursive',
    chunkSize: 500,
    chunkOverlap: 50,
    userId: 'user-1',
    createdAt: new Date(),
    documents: [],
  };

  const mockRepo = {
    find: jest.fn().mockResolvedValue([mockKb]),
    findOne: jest.fn().mockResolvedValue(mockKb),
    findOneBy: jest.fn().mockResolvedValue(mockKb),
    create: jest.fn().mockReturnValue(mockKb),
    save: jest.fn().mockResolvedValue(mockKb),
    delete: jest.fn().mockResolvedValue({ affected: 1, raw: {} }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        { provide: getRepositoryToken(KnowledgeBase), useValue: mockRepo },
      ],
    }).compile();
    service = module.get<KnowledgeService>(KnowledgeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return knowledge bases for a user', async () => {
      const result = await service.findAll('user-1');
      expect(result).toEqual([mockKb]);
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        relations: { documents: true },
      });
    });
  });

  describe('findById', () => {
    it('should return a knowledge base by id', async () => {
      const result = await service.findById('uuid-1');
      expect(result).toEqual(mockKb);
    });
  });

  describe('create', () => {
    it('should create a knowledge base', async () => {
      const dto = { name: 'Test KB' };
      const result = await service.create('user-1', dto);
      expect(result).toEqual(mockKb);
      expect(mockRepo.create).toHaveBeenCalledWith({ ...dto, userId: 'user-1' });
    });
  });

  describe('delete', () => {
    it('should delete a knowledge base', async () => {
      await service.delete('uuid-1');
      expect(mockRepo.delete).toHaveBeenCalledWith('uuid-1');
    });

    it('should throw NotFoundException if not found', async () => {
      mockRepo.findOneBy.mockResolvedValueOnce(null);
      await expect(service.delete('nonexistent')).rejects.toThrow('Knowledge base not found');
    });
  });
});
