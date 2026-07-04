import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChromaVectorStoreService } from '../common/vectore-store/chroma-vector-store.service';
import { DocumentService } from './document.service';
import { DocumentSegment } from './entities/document-segment.entity';
import { Document } from './entities/document.entity';
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

  const mockKbRepo = {
    find: jest.fn().mockResolvedValue([mockKb]),
    findOne: jest.fn().mockResolvedValue(mockKb),
    findOneBy: jest.fn().mockResolvedValue(mockKb),
    create: jest.fn().mockReturnValue(mockKb),
    save: jest.fn().mockResolvedValue(mockKb),
    delete: jest.fn().mockResolvedValue({ affected: 1, raw: {} }),
  };

  const mockDocRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockSegmentRepo = {
    delete: jest.fn().mockResolvedValue({ affected: 0, raw: {} }),
  };

  const mockDocService = {
    delete: jest.fn().mockResolvedValue(undefined),
  };

  const mockVectorStore = {
    deleteByFilter: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        { provide: getRepositoryToken(KnowledgeBase), useValue: mockKbRepo },
        { provide: getRepositoryToken(Document), useValue: mockDocRepo },
        { provide: getRepositoryToken(DocumentSegment), useValue: mockSegmentRepo },
        { provide: DocumentService, useValue: mockDocService },
        { provide: ChromaVectorStoreService, useValue: mockVectorStore },
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
      expect(mockKbRepo.find).toHaveBeenCalledWith({
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
      expect(mockKbRepo.create).toHaveBeenCalledWith({ ...dto, userId: 'user-1' });
    });
  });

  describe('deleteForUser', () => {
    it('should delete a knowledge base with no documents', async () => {
      mockDocRepo.find.mockResolvedValueOnce([]);
      await service.deleteForUser('uuid-1', 'user-1');
      expect(mockKbRepo.delete).toHaveBeenCalledWith('uuid-1');
    });

    it('should delete associated documents before knowledge base', async () => {
      const mockDoc = { id: 'doc-1' };
      mockDocRepo.find.mockResolvedValueOnce([mockDoc]);
      await service.deleteForUser('uuid-1', 'user-1');
      expect(mockDocService.delete).toHaveBeenCalledWith('doc-1');
      expect(mockVectorStore.deleteByFilter).toHaveBeenCalledWith({ knowledgeBaseId: 'uuid-1' });
      expect(mockKbRepo.delete).toHaveBeenCalledWith('uuid-1');
    });

    it('should throw NotFoundException if not found', async () => {
      mockKbRepo.findOneBy.mockResolvedValueOnce(null);
      await expect(service.deleteForUser('nonexistent', 'user-1')).rejects.toThrow(
        'Knowledge base not found'
      );
    });
  });
});
