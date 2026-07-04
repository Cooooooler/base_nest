import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChromaVectorStoreService } from '../common/vectore-store/chroma-vector-store.service';
import { DocumentService } from './document.service';
import { CreateKnowledgeBaseDto } from './dto/create-knowledge-base.dto';
import { DocumentSegment } from './entities/document-segment.entity';
import { Document } from './entities/document.entity';
import { KnowledgeBase } from './entities/knowledge-base.entity';

@Injectable()
export class KnowledgeService {
  constructor(
    @InjectRepository(KnowledgeBase)
    private readonly kbRepo: Repository<KnowledgeBase>,
    @InjectRepository(Document)
    private readonly docRepo: Repository<Document>,
    @InjectRepository(DocumentSegment)
    private readonly segmentRepo: Repository<DocumentSegment>,
    private readonly documentService: DocumentService,
    private readonly vectorStore: ChromaVectorStoreService
  ) {}

  async findAll(userId: string): Promise<KnowledgeBase[]> {
    return this.kbRepo.find({
      where: { userId },
      relations: { documents: true },
    });
  }

  async findById(id: string): Promise<KnowledgeBase | null> {
    return this.kbRepo.findOne({
      where: { id },
      relations: { documents: true },
    });
  }

  async findByIdForUser(id: string, userId: string): Promise<KnowledgeBase | null> {
    return this.kbRepo.findOne({
      where: { id, userId },
      relations: { documents: true },
    });
  }

  async create(userId: string, dto: CreateKnowledgeBaseDto): Promise<KnowledgeBase> {
    const kb = this.kbRepo.create({ ...dto, userId });
    return this.kbRepo.save(kb);
  }

  async deleteForUser(id: string, userId: string): Promise<void> {
    const kb = await this.kbRepo.findOneBy({ id, userId });
    if (!kb) throw new NotFoundException('Knowledge base not found');

    // Delete all associated documents (handles segments, vectors, files)
    const docs = await this.docRepo.find({ where: { knowledgeBaseId: id } });
    for (const doc of docs) {
      await this.documentService.delete(doc.id);
    }

    // Also clean up Chroma vectors by knowledge base
    await this.vectorStore.deleteByFilter({ knowledgeBaseId: id });

    // Clean up orphan segments (safety net)
    await this.segmentRepo.delete({ knowledgeBaseId: id });

    await this.kbRepo.delete(id);
  }
}
