import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmbeddingFactory } from '../common/embeddings/embedding-factory.service';
import { ChromaVectorStoreService } from '../common/vectore-store/chroma-vector-store.service';
import { ChunkProcessorService } from './chunking/chunk-processor.service';
import { DocumentSegment } from './entities/document-segment.entity';
import { Document as DocEntity, DocumentStatus } from './entities/document.entity';
import { KnowledgeBase } from './entities/knowledge-base.entity';
import { FileStorageService } from './storage/file-storage.service';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    @InjectRepository(DocEntity)
    private readonly docRepo: Repository<DocEntity>,
    @InjectRepository(DocumentSegment)
    private readonly segmentRepo: Repository<DocumentSegment>,
    @InjectRepository(KnowledgeBase)
    private readonly kbRepo: Repository<KnowledgeBase>,
    private readonly chunkProcessor: ChunkProcessorService,
    private readonly fileStorage: FileStorageService,
    private readonly vectorStore: ChromaVectorStoreService,
    private readonly embeddingFactory: EmbeddingFactory,
    private readonly eventEmitter: EventEmitter2
  ) {}

  async findByKnowledgeBase(knowledgeBaseId: string): Promise<DocEntity[]> {
    return this.docRepo.find({ where: { knowledgeBaseId }, order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<DocEntity | null> {
    return this.docRepo.findOne({ where: { id }, relations: { segments: true } });
  }

  async upload(knowledgeBaseId: string, fileName: string, buffer: Buffer): Promise<DocEntity> {
    const kb = await this.kbRepo.findOneBy({ id: knowledgeBaseId });
    if (!kb) throw new NotFoundException('Knowledge base not found');

    const ext = fileName.split('.').pop()?.toLowerCase() || 'txt';
    const storagePath = await this.fileStorage.save(fileName, buffer);

    const doc = this.docRepo.create({
      knowledgeBaseId,
      fileName,
      fileType: ext,
      fileSize: buffer.length,
      storagePath,
      status: 'pending' as DocumentStatus,
    });

    const saved = await this.docRepo.save(doc);

    // Emit event to process document asynchronously
    this.eventEmitter.emit('document.uploaded', { documentId: saved.id });

    return saved;
  }

  async processDocument(docId: string): Promise<void> {
    const doc = await this.docRepo.findOneBy({ id: docId });
    if (!doc) throw new NotFoundException('Document not found');

    await this.docRepo.update(docId, { status: 'processing' });

    try {
      const buffer = await this.fileStorage.read(doc.storagePath);
      let text = '';

      if (doc.fileType === 'pdf') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { PDFParse } = require('pdf-parse') as {
          PDFParse: new (opts: { data: Buffer }) => {
            getText(): Promise<{ text: string }>;
            destroy(): Promise<void>;
          };
        };
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        text = result.text;
        await parser.destroy();
      } else {
        text = buffer.toString('utf-8');
      }

      const kb = await this.kbRepo.findOneBy({ id: doc.knowledgeBaseId });
      const chunks = await this.chunkProcessor.chunkText(text, {
        chunkSize: kb?.chunkSize || 500,
        chunkOverlap: kb?.chunkOverlap || 50,
      });

      // Save segments to DB in batch
      const segments = chunks.map((chunk) =>
        this.segmentRepo.create({
          documentId: docId,
          knowledgeBaseId: doc.knowledgeBaseId,
          index: chunk.index,
          content: chunk.content,
          charCount: chunk.charCount,
          metadata: { ...chunk.metadata, fileName: doc.fileName },
        })
      );
      await this.segmentRepo.save(segments);

      // Store vectors in Chroma using KB-configured embedding model
      const embeddings = this.embeddingFactory.create(kb?.embeddingModel ?? 'mxbai-embed-large');
      await this.vectorStore.addDocuments(
        chunks.map((c) => ({
          pageContent: c.content,
          metadata: {
            documentId: docId,
            knowledgeBaseId: doc.knowledgeBaseId,
            index: c.index,
            fileName: doc.fileName,
          },
        })),
        embeddings
      );

      await this.docRepo.update(docId, {
        status: 'completed',
        charCount: text.length,
        processedAt: new Date(),
      });
    } catch (err) {
      this.logger.error(
        `Document processing failed for ${docId}: ${(err as Error).message}`,
        (err as Error).stack
      );
      await this.docRepo.update(docId, {
        status: 'failed',
        errorMessage: (err as Error).message,
      });
    }
  }

  async delete(id: string): Promise<void> {
    const doc = await this.docRepo.findOneBy({ id });
    if (!doc) throw new NotFoundException('Document not found');
    await this.fileStorage.delete(doc.storagePath);
    await this.segmentRepo.delete({ documentId: id });
    await this.vectorStore.deleteByFilter({ documentId: id });
    await this.docRepo.delete(id);
  }

  async getSegments(documentId: string): Promise<DocumentSegment[]> {
    return this.segmentRepo.find({
      where: { documentId },
      order: { index: 'ASC' },
    });
  }
}
