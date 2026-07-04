import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocalAIModule } from '../common/local-ai.module';
import { ChunkProcessorService } from './chunking/chunk-processor.service';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { DocumentSegment } from './entities/document-segment.entity';
import { Document } from './entities/document.entity';
import { KnowledgeBase } from './entities/knowledge-base.entity';
import { DocumentProcessingListener } from './events/document-processing.listener';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { RetrievalService } from './retrieval.service';
import { FileStorageService } from './storage/file-storage.service';

import { AuthGuardModule } from '../auth/auth-guard.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([KnowledgeBase, Document, DocumentSegment]),
    AuthGuardModule,
    LocalAIModule,
  ],
  controllers: [KnowledgeController, DocumentController],
  providers: [
    KnowledgeService,
    DocumentService,
    RetrievalService,
    ChunkProcessorService,
    FileStorageService,
    DocumentProcessingListener,
  ],
  exports: [KnowledgeService, RetrievalService],
})
export class KnowledgeModule {}
