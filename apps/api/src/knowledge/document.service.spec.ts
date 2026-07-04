import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { fromPartial } from '@total-typescript/shoehorn';
import { EmbeddingFactory } from '../common/embeddings/embedding-factory.service';
import { ChromaVectorStoreService } from '../common/vectore-store/chroma-vector-store.service';
import { ChunkProcessorService } from './chunking/chunk-processor.service';
import { DocumentService } from './document.service';
import { DocumentSegment } from './entities/document-segment.entity';
import { Document } from './entities/document.entity';
import { KnowledgeBase } from './entities/knowledge-base.entity';
import { FileStorageService } from './storage/file-storage.service';

describe('DocumentService', () => {
  let service: DocumentService;

  const mockDoc = fromPartial<Document>({
    id: 'doc-1',
    knowledgeBaseId: 'kb-1',
    fileName: 'test.txt',
    fileType: 'txt',
    fileSize: 100,
    storagePath: '/storage/test.txt',
    status: 'pending',
    errorMessage: null,
    charCount: 0,
    tokenCount: null,
    processedAt: null,
    createdAt: new Date(),
  });

  const mockDocRepo = {
    find: jest.fn().mockResolvedValue([mockDoc]),
    findOne: jest.fn().mockResolvedValue(mockDoc),
    findOneBy: jest.fn().mockResolvedValue(mockDoc),
    create: jest.fn().mockImplementation((data) => data),
    save: jest.fn().mockImplementation((data) => Promise.resolve({ ...mockDoc, ...data })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1, raw: {} }),
  };

  const mockSegmentRepo = {
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((data) => data),
    save: jest.fn().mockImplementation((data) => Promise.resolve(data)),
    delete: jest.fn().mockResolvedValue({ affected: 0, raw: {} }),
  };

  const mockKbRepo = {
    findOneBy: jest.fn().mockResolvedValue({
      id: 'kb-1',
      chunkSize: 500,
      chunkOverlap: 50,
      embeddingModel: 'mxbai-embed-large',
    }),
  };

  const mockChunkProcessor = {
    chunkText: jest.fn().mockResolvedValue([
      { content: 'chunk1', index: 0, charCount: 6, metadata: {} },
      { content: 'chunk2', index: 1, charCount: 6, metadata: {} },
    ]),
  };

  const mockFileStorage = {
    save: jest.fn().mockResolvedValue('/storage/test.txt'),
    read: jest.fn().mockResolvedValue(Buffer.from('file content')),
    delete: jest.fn().mockResolvedValue(undefined),
  };

  const mockVectorStore = {
    addDocuments: jest.fn().mockResolvedValue(['id1', 'id2']),
    deleteByFilter: jest.fn().mockResolvedValue(undefined),
  };

  const mockEmbeddingFactory = {
    create: jest.fn().mockReturnValue({}),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentService,
        { provide: getRepositoryToken(Document), useValue: mockDocRepo },
        { provide: getRepositoryToken(DocumentSegment), useValue: mockSegmentRepo },
        { provide: getRepositoryToken(KnowledgeBase), useValue: mockKbRepo },
        { provide: ChunkProcessorService, useValue: mockChunkProcessor },
        { provide: FileStorageService, useValue: mockFileStorage },
        { provide: ChromaVectorStoreService, useValue: mockVectorStore },
        { provide: EmbeddingFactory, useValue: mockEmbeddingFactory },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<DocumentService>(DocumentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByKnowledgeBase', () => {
    it('should return documents for a knowledge base', async () => {
      const result = await service.findByKnowledgeBase('kb-1');
      expect(result).toEqual([mockDoc]);
      expect(mockDocRepo.find).toHaveBeenCalledWith({
        where: { knowledgeBaseId: 'kb-1' },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findById', () => {
    it('should return a document with segments', async () => {
      const result = await service.findById('doc-1');
      expect(result).toEqual(mockDoc);
      expect(mockDocRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        relations: { segments: true },
      });
    });
  });

  describe('upload', () => {
    it('should upload and return pending document and emit event', async () => {
      const buffer = Buffer.from('test content');
      const result = await service.upload('kb-1', 'test.txt', buffer);

      expect(result.status).toBe('pending');
      expect(mockFileStorage.save).toHaveBeenCalledWith('test.txt', buffer);
      expect(mockDocRepo.create).toHaveBeenCalledWith({
        knowledgeBaseId: 'kb-1',
        fileName: 'test.txt',
        fileType: 'txt',
        fileSize: buffer.length,
        storagePath: '/storage/test.txt',
        status: 'pending',
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('document.uploaded', {
        documentId: 'doc-1',
      });
    });

    it('should throw NotFoundException if knowledge base not found', async () => {
      mockKbRepo.findOneBy.mockResolvedValueOnce(null);
      await expect(service.upload('nonexistent', 'test.txt', Buffer.from(''))).rejects.toThrow(
        NotFoundException
      );
    });

    it('should use the whole filename as fileType when file has no extension', async () => {
      const buffer = Buffer.from('content');
      const result = await service.upload('kb-1', 'noext', buffer);
      expect(result.fileType).toBe('noext');
    });
  });

  describe('processDocument', () => {
    it('should process a document from pending to completed', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2024-01-01'));
      const doc = {
        ...mockDoc,
        storagePath: '/storage/test.txt',
        fileType: 'txt',
        knowledgeBaseId: 'kb-1',
      };
      mockDocRepo.findOneBy.mockResolvedValueOnce(doc);

      await service.processDocument('doc-1');

      expect(mockDocRepo.update).toHaveBeenCalledWith('doc-1', { status: 'processing' });
      expect(mockFileStorage.read).toHaveBeenCalledWith('/storage/test.txt');
      expect(mockChunkProcessor.chunkText).toHaveBeenCalledWith('file content', {
        chunkSize: 500,
        chunkOverlap: 50,
      });
      expect(mockSegmentRepo.save).toHaveBeenCalled();
      expect(mockVectorStore.addDocuments).toHaveBeenCalled();
      expect(mockDocRepo.update).toHaveBeenCalledWith('doc-1', {
        status: 'completed',
        charCount: 'file content'.length,
        processedAt: new Date('2024-01-01'),
      });
      jest.useRealTimers();
    });

    it('should handle pdf files', async () => {
      const pdfDoc = {
        ...mockDoc,
        fileType: 'pdf',
        storagePath: '/storage/doc.pdf',
        knowledgeBaseId: 'kb-1',
      };
      mockDocRepo.findOneBy.mockResolvedValueOnce(pdfDoc);
      mockFileStorage.read.mockResolvedValueOnce(Buffer.from('pdf-binary'));

      await service.processDocument('doc-1');

      // PDF files try to parse with pdf-parse, but since it's not installed
      // it should fall to error path
      expect(mockDocRepo.update).toHaveBeenCalledWith(
        'doc-1',
        expect.objectContaining({
          status: 'failed',
        })
      );
    });

    it('should set status to failed on error', async () => {
      mockDocRepo.findOneBy.mockResolvedValueOnce(mockDoc);
      mockFileStorage.read.mockRejectedValueOnce(new Error('File not found'));

      await service.processDocument('doc-1');

      expect(mockDocRepo.update).toHaveBeenCalledWith(
        'doc-1',
        expect.objectContaining({
          status: 'failed',
          errorMessage: 'File not found',
        })
      );
    });

    it('should throw if document not found', async () => {
      mockDocRepo.findOneBy.mockResolvedValueOnce(null);
      await expect(service.processDocument('nonexistent')).rejects.toThrow('Document not found');
    });
  });

  describe('delete', () => {
    it('should delete document and its segments and vectors', async () => {
      const doc = { ...mockDoc, storagePath: '/storage/test.txt' };
      mockDocRepo.findOneBy.mockResolvedValue(doc);

      await service.delete('doc-1');

      expect(mockFileStorage.delete).toHaveBeenCalledWith('/storage/test.txt');
      expect(mockSegmentRepo.delete).toHaveBeenCalledWith({ documentId: 'doc-1' });
      expect(mockVectorStore.deleteByFilter).toHaveBeenCalledWith({ documentId: 'doc-1' });
      expect(mockDocRepo.delete).toHaveBeenCalledWith('doc-1');
    });

    it('should throw if document not found', async () => {
      mockDocRepo.findOneBy.mockResolvedValue(null);
      await expect(service.delete('nonexistent')).rejects.toThrow('Document not found');
    });
  });

  describe('getSegments', () => {
    it('should return segments for a document', async () => {
      mockSegmentRepo.find.mockResolvedValueOnce([
        { id: 'seg-1', documentId: 'doc-1', content: 'segment', index: 0 },
      ]);

      const result = await service.getSegments('doc-1');

      expect(result).toHaveLength(1);
      expect(mockSegmentRepo.find).toHaveBeenCalledWith({
        where: { documentId: 'doc-1' },
        order: { index: 'ASC' },
      });
    });
  });
});
