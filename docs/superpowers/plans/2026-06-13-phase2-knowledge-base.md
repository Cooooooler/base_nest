# 阶段二：RAG 知识库 — 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 构建 RAG 知识库模块，支持文档上传、分块、向量化存储和语义检索。

**架构：** `KnowledgeModule` 管理知识库和文档实体，使用已有的 `EmbeddingsService`（mxbai-embed-large）做向量化，`ChromaVectorStoreService` 做向量存储。文档分块使用 LangChain `RecursiveCharacterTextSplitter`。

**前置依赖：**
- [x] 阶段一完成（Provider 模块、加密工具）
- [x] LocalAIModule + EmbeddingsService + ChromaVectorStoreService
- [x] Ollama 已安装 + qwen2.5:7b / mxbai-embed-large 模型已拉取
- [x] Chroma 服务已启动（`chroma run --path ./chroma_data`）

---

## 文件结构

```
src/
  knowledge/
    knowledge.module.ts
    knowledge.controller.ts          # 知识库 CRUD
    knowledge.service.ts
    knowledge.service.spec.ts
    document.controller.ts           # 文档管理 API
    document.service.ts
    document.service.spec.ts
    retrieval.service.ts             # 检索服务
    retrieval.service.spec.ts
    entities/
      knowledge-base.entity.ts       # 知识库
      document.entity.ts             # 文档
      document-segment.entity.ts     # 文档分段
    dto/
      create-knowledge-base.dto.ts
      upload-document.dto.ts
      retrieval-query.dto.ts
    chunking/
      chunk-processor.service.ts     # 文档分块处理
    storage/
      file-storage.service.ts        # 文件存储
```

### 修改的文件

- `src/app.module.ts` — 注册 KnowledgeModule
- `.env.example` — 新增存储路径配置

---

### 任务 1：安装依赖

- [ ] **步骤 1：安装文档解析和分块依赖**

```bash
pnpm add pdf-parse @langchain/textsplitters
```

- [ ] **步骤 2：Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add pdf-parse and langchain text splitters"
```

---

### 任务 2：知识库实体定义

**文件：**
- 创建：`src/knowledge/entities/knowledge-base.entity.ts`
- 创建：`src/knowledge/entities/document.entity.ts`
- 创建：`src/knowledge/entities/document-segment.entity.ts`

- [ ] **步骤 1：创建 KnowledgeBase 实体**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Document } from './document.entity';

@Entity('knowledge_bases')
export class KnowledgeBase {
  @ApiProperty({ format: 'uuid', description: '知识库唯一标识' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: '产品文档库', description: '知识库名称' })
  @Column({ length: 200 })
  name: string;

  @ApiProperty({ example: '包含所有产品相关文档', description: '知识库描述', required: false })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({ example: 'mxbai-embed-large', description: '嵌入模型名称' })
  @Column({ length: 100, default: 'mxbai-embed-large' })
  embeddingModel: string;

  @ApiProperty({ example: 'recursive', description: '分块策略' })
  @Column({ length: 50, default: 'recursive' })
  chunkStrategy: string;

  @ApiProperty({ example: 500, description: '分块大小（字符数）' })
  @Column({ default: 500 })
  chunkSize: number;

  @ApiProperty({ example: 50, description: '分块重叠（字符数）' })
  @Column({ default: 50 })
  chunkOverlap: number;

  @Column()
  userId: string;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => Document, (doc) => doc.knowledgeBase)
  documents: Document[];
}
```

- [ ] **步骤 2：创建 Document 实体**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { DocumentSegment } from './document-segment.entity';
import { KnowledgeBase } from './knowledge-base.entity';

export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed';

@Entity('documents')
export class Document {
  @ApiProperty({ format: 'uuid', description: '文档唯一标识' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  knowledgeBaseId: string;

  @ApiProperty({ example: '产品手册.pdf', description: '文件名' })
  @Column({ length: 500 })
  fileName: string;

  @ApiProperty({ example: 'pdf', description: '文件类型' })
  @Column({ length: 20 })
  fileType: string;

  @ApiProperty({ example: 1024000, description: '文件大小（字节）' })
  @Column({ default: 0 })
  fileSize: number;

  @ApiProperty({ description: '文件存储路径' })
  @Column({ length: 1000 })
  storagePath: string;

  @ApiProperty({ example: 'completed', description: '处理状态' })
  @Column({ length: 20, default: 'pending' })
  status: DocumentStatus;

  @ApiProperty({ description: '错误信息', required: false })
  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @ApiProperty({ example: 5000, description: '字符数' })
  @Column({ default: 0 })
  charCount: number;

  @ApiProperty({ example: 1200, description: 'Token 数', required: false })
  @Column({ nullable: true })
  tokenCount: number | null;

  @ApiProperty({ description: '处理完成时间', required: false })
  @Column({ type: 'timestamptz', nullable: true })
  processedAt: Date | null;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => KnowledgeBase, (kb) => kb.documents)
  @JoinColumn({ name: 'knowledgeBaseId' })
  knowledgeBase: KnowledgeBase;

  @OneToMany(() => DocumentSegment, (seg) => seg.document)
  segments: DocumentSegment[];
}
```

- [ ] **步骤 3：创建 DocumentSegment 实体**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Document } from './document.entity';

@Entity('document_segments')
export class DocumentSegment {
  @ApiProperty({ format: 'uuid', description: '分段唯一标识' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  documentId: string;

  @Column()
  knowledgeBaseId: string;

  @ApiProperty({ example: 0, description: '分段序号' })
  @Column()
  index: number;

  @ApiProperty({ example: '这是文档内容...', description: '分段内容' })
  @Column({ type: 'text' })
  content: string;

  @ApiProperty({ example: 500, description: '字符数' })
  @Column({ default: 0 })
  charCount: number;

  @ApiProperty({ example: 120, description: 'Token 数' })
  @Column({ nullable: true })
  tokenCount: number | null;

  @ApiProperty({ example: { page: 1 }, description: '元数据' })
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Document, (doc) => doc.segments)
  @JoinColumn({ name: 'documentId' })
  document: Document;
}
```

- [ ] **步骤 4：生成迁移**

```bash
cd F:/project/nest/base_nest && pnpm run build && pnpm run migration:generate -- src/database/migrations/CreateKnowledgeTables && pnpm run migration:run
```

- [ ] **步骤 5：Commit**

```bash
git add src/knowledge/entities/ src/database/migrations/
git commit -m "feat: add KnowledgeBase, Document, DocumentSegment entities and migration"
```

---

### 任务 3：文件存储服务

**文件：**
- 创建：`src/knowledge/storage/file-storage.service.ts`

- [ ] **步骤 1：创建文件存储服务**

```typescript
import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class FileStorageService {
  private basePath: string;

  constructor() {
    this.basePath = process.env.STORAGE_LOCAL_PATH || './storage';
  }

  async save(fileName: string, buffer: Buffer): Promise<string> {
    const dateDir = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const dir = path.join(this.basePath, 'documents', dateDir);
    await fs.mkdir(dir, { recursive: true });

    const uniqueName = `${Date.now()}-${fileName}`;
    const filePath = path.join(dir, uniqueName);
    await fs.writeFile(filePath, buffer);

    return filePath;
  }

  async read(filePath: string): Promise<Buffer> {
    return fs.readFile(filePath);
  }

  async delete(filePath: string): Promise<void> {
    await fs.unlink(filePath).catch(() => {});
  }
}
```

- [ ] **步骤 2：Commit**

```bash
git add src/knowledge/storage/file-storage.service.ts
git commit -m "feat: add file storage service for document uploads"
```

---

### 任务 4：分块处理服务

**文件：**
- 创建：`src/knowledge/chunking/chunk-processor.service.ts`

- [ ] **步骤 1：创建分块处理器（使用 LangChain）**

```typescript
import { Injectable } from '@nestjs/common';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

export interface ChunkResult {
  content: string;
  index: number;
  charCount: number;
  metadata: Record<string, any>;
}

@Injectable()
export class ChunkProcessorService {
  async chunkText(
    text: string,
    options: { chunkSize?: number; chunkOverlap?: number } = {}
  ): Promise<ChunkResult[]> {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: options.chunkSize || 500,
      chunkOverlap: options.chunkOverlap || 50,
    });

    const docs = await splitter.createDocuments([text]);

    return docs.map((doc, index) => ({
      content: doc.pageContent,
      index,
      charCount: doc.pageContent.length,
      metadata: doc.metadata,
    }));
  }

  async chunkPdf(
    pdfText: string,
    options: { chunkSize?: number; chunkOverlap?: number } = {}
  ): Promise<ChunkResult[]> {
    // PDF text extracted by pdf-parse, then same chunking logic
    return this.chunkText(pdfText, options);
  }
}
```

- [ ] **步骤 2：Commit**

```bash
git add src/knowledge/chunking/chunk-processor.service.ts
git commit -m "feat: add chunk processor service using LangChain text splitter"
```

---

### 任务 5：KnowledgeModule + DTO

**文件：**
- 创建：`src/knowledge/knowledge.module.ts`
- 创建：`src/knowledge/dto/create-knowledge-base.dto.ts`
- 创建：`src/knowledge/dto/upload-document.dto.ts`
- 创建：`src/knowledge/dto/retrieval-query.dto.ts`
- 修改：`src/app.module.ts`

- [ ] **步骤 1：创建 DTO**

`src/knowledge/dto/create-knowledge-base.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateKnowledgeBaseDto {
  @ApiProperty({ example: '产品文档库', description: '知识库名称' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: '包含所有产品文档', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 500, required: false, description: '分块大小' })
  @IsOptional()
  @IsNumber()
  @Min(100)
  chunkSize?: number;

  @ApiProperty({ example: 50, required: false, description: '分块重叠' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  chunkOverlap?: number;
}
```

`src/knowledge/dto/retrieval-query.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class RetrievalQueryDto {
  @ApiProperty({ example: '产品使用方法', description: '查询文本' })
  @IsString()
  query: string;

  @ApiProperty({ example: 4, required: false, description: '返回结果数量' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  topK?: number;
}
```

- [ ] **步骤 2：创建 Module**

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeBase } from './entities/knowledge-base.entity';
import { Document } from './entities/document.entity';
import { DocumentSegment } from './entities/document-segment.entity';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { DocumentController } from './document.controller';
import { DocumentService } from './document.service';
import { RetrievalService } from './retrieval.service';
import { ChunkProcessorService } from './chunking/chunk-processor.service';
import { FileStorageService } from './storage/file-storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([KnowledgeBase, Document, DocumentSegment])],
  controllers: [KnowledgeController, DocumentController],
  providers: [
    KnowledgeService,
    DocumentService,
    RetrievalService,
    ChunkProcessorService,
    FileStorageService,
  ],
  exports: [KnowledgeService, RetrievalService],
})
export class KnowledgeModule {}
```

- [ ] **步骤 3：在 AppModule 中注册**

在 `src/app.module.ts` 的 imports 中添加 `KnowledgeModule`。

- [ ] **步骤 4：Commit**

```bash
git add src/knowledge/knowledge.module.ts src/knowledge/dto/ src/app.module.ts
git commit -m "feat: scaffold KnowledgeModule with DTOs"
```

---

### 任务 6：KnowledgeService

**文件：**
- 创建：`src/knowledge/knowledge.service.ts`
- 创建：`src/knowledge/knowledge.service.spec.ts`

- [ ] **步骤 1：编写 KnowledgeService**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateKnowledgeBaseDto } from './dto/create-knowledge-base.dto';
import { KnowledgeBase } from './entities/knowledge-base.entity';

@Injectable()
export class KnowledgeService {
  constructor(
    @InjectRepository(KnowledgeBase)
    private readonly kbRepo: Repository<KnowledgeBase>
  ) {}

  async findAll(userId: string): Promise<KnowledgeBase[]> {
    return this.kbRepo.find({ where: { userId }, relations: { documents: true } });
  }

  async findById(id: string): Promise<KnowledgeBase | null> {
    return this.kbRepo.findOne({ where: { id }, relations: { documents: true } });
  }

  async create(userId: string, dto: CreateKnowledgeBaseDto): Promise<KnowledgeBase> {
    const kb = this.kbRepo.create({ ...dto, userId });
    return this.kbRepo.save(kb);
  }

  async delete(id: string): Promise<void> {
    const kb = await this.kbRepo.findOneBy({ id });
    if (!kb) throw new NotFoundException('Knowledge base not found');
    await this.kbRepo.delete(id);
  }
}
```

- [ ] **步骤 2：编写测试**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { KnowledgeBase } from './entities/knowledge-base.entity';
import { KnowledgeService } from './knowledge.service';

describe('KnowledgeService', () => {
  let service: KnowledgeService;

  const mockKb = {
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

  it('findAll should return knowledge bases', async () => {
    const result = await service.findAll('user-1');
    expect(result).toEqual([mockKb]);
  });

  it('findById should return a knowledge base', async () => {
    const result = await service.findById('uuid-1');
    expect(result).toEqual(mockKb);
  });

  it('create should create a knowledge base', async () => {
    const dto = { name: 'Test KB' };
    const result = await service.create('user-1', dto);
    expect(result).toEqual(mockKb);
  });

  it('delete should remove a knowledge base', async () => {
    await service.delete('uuid-1');
    expect(mockRepo.delete).toHaveBeenCalledWith('uuid-1');
  });
});
```

- [ ] **步骤 3：运行测试**

```bash
cd F:/project/nest/base_nest && pnpm run test -- knowledge.service.spec.ts
```

- [ ] **步骤 4：Commit**

```bash
git add src/knowledge/knowledge.service.ts src/knowledge/knowledge.service.spec.ts
git commit -m "feat: implement KnowledgeService with CRUD"
```

---

### 任务 7：DocumentService（文档上传 + 处理流水线）

**文件：**
- 创建：`src/knowledge/document.service.ts`
- 创建：`src/knowledge/document.service.spec.ts`
- 修改：`src/knowledge/knowledge.module.ts` — 添加 LocalAIModule 导入

- [ ] **步骤 1：编写 DocumentService**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as pdfParse from 'pdf-parse';
import { Document as DocEntity, DocumentStatus } from './entities/document.entity';
import { DocumentSegment } from './entities/document-segment.entity';
import { KnowledgeBase } from './entities/knowledge-base.entity';
import { ChunkProcessorService } from './chunking/chunk-processor.service';
import { FileStorageService } from './storage/file-storage.service';
import { ChromaVectorStoreService } from '../common/vectore-store/chroma-vector-store.service';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(DocEntity)
    private readonly docRepo: Repository<DocEntity>,
    @InjectRepository(DocumentSegment)
    private readonly segmentRepo: Repository<DocumentSegment>,
    @InjectRepository(KnowledgeBase)
    private readonly kbRepo: Repository<KnowledgeBase>,
    private readonly chunkProcessor: ChunkProcessorService,
    private readonly fileStorage: FileStorageService,
    private readonly vectorStore: ChromaVectorStoreService
  ) {}

  async findByKnowledgeBase(knowledgeBaseId: string): Promise<DocEntity[]> {
    return this.docRepo.find({ where: { knowledgeBaseId }, order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<DocEntity | null> {
    return this.docRepo.findOne({ where: { id }, relations: { segments: true } });
  }

  async upload(
    knowledgeBaseId: string,
    fileName: string,
    buffer: Buffer
  ): Promise<DocEntity> {
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
      status: 'pending',
    });

    const saved = await this.docRepo.save(doc);

    // Process asynchronously
    this.processDocument(saved.id).catch((err) => {
      console.error(`Document processing failed: ${err.message}`);
    });

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
        const pdfData = await pdfParse(buffer);
        text = pdfData.text;
      } else {
        text = buffer.toString('utf-8');
      }

      const kb = await this.kbRepo.findOneBy({ id: doc.knowledgeBaseId });
      const chunks = await this.chunkProcessor.chunkText(text, {
        chunkSize: kb?.chunkSize || 500,
        chunkOverlap: kb?.chunkOverlap || 50,
      });

      for (const chunk of chunks) {
        const segment = this.segmentRepo.create({
          documentId: docId,
          knowledgeBaseId: doc.knowledgeBaseId,
          index: chunk.index,
          content: chunk.content,
          charCount: chunk.charCount,
          metadata: { ...chunk.metadata, fileName: doc.fileName },
        });
        await this.segmentRepo.save(segment);
      }

      // Store in vector DB
      await this.vectorStore.addDocuments(
        chunks.map((c) => ({
          pageContent: c.content,
          metadata: { documentId: docId, knowledgeBaseId: doc.knowledgeBaseId, index: c.index, fileName: doc.fileName },
        }))
      );

      await this.docRepo.update(docId, {
        status: 'completed',
        charCount: text.length,
        processedAt: new Date(),
      });
    } catch (err) {
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
    await this.docRepo.delete(id);
  }
}
```

- [ ] **步骤 2：更新 Module 导入 LocalAIModule**

修改 `src/knowledge/knowledge.module.ts`，在 imports 中添加 `LocalAIModule`：

```typescript
imports: [
  TypeOrmModule.forFeature([KnowledgeBase, Document, DocumentSegment]),
  LocalAIModule,  // 提供 ChromaVectorStoreService
],
```

- [ ] **步骤 3：Commit**

```bash
git add src/knowledge/document.service.ts src/knowledge/knowledge.module.ts
git commit -m "feat: implement DocumentService with upload, chunking and vector storage"
```

---

### 任务 8：RetrievalService

**文件：**
- 创建：`src/knowledge/retrieval.service.ts`
- 创建：`src/knowledge/retrieval.service.spec.ts`

- [ ] **步骤 1：编写 RetrievalService**

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentSegment } from './entities/document-segment.entity';
import { ChromaVectorStoreService } from '../common/vectore-store/chroma-vector-store.service';

@Injectable()
export class RetrievalService {
  constructor(
    @InjectRepository(DocumentSegment)
    private readonly segmentRepo: Repository<DocumentSegment>,
    private readonly vectorStore: ChromaVectorStoreService
  ) {}

  async search(knowledgeBaseId: string, query: string, topK: number = 4) {
    const results = await this.vectorStore.similaritySearch(query, topK);

    // Enrich with DB data
    const segments = await this.segmentRepo.findByIds(
      results.map((r) => r.metadata?.documentId).filter(Boolean)
    );

    return results.map((doc) => ({
      content: doc.pageContent,
      metadata: doc.metadata,
      score: undefined, // Chroma similarity search doesn't return scores by default
    }));
  }

  async searchWithScore(knowledgeBaseId: string, query: string, topK: number = 4) {
    const results = await this.vectorStore.similaritySearchWithScore(query, topK);
    return results.map(([doc, score]) => ({
      content: doc.pageContent,
      metadata: doc.metadata,
      score: 1 - score, // Convert distance to similarity
    }));
  }
}
```

- [ ] **步骤 2：Commit**

```bash
git add src/knowledge/retrieval.service.ts
git commit -m "feat: implement RetrievalService with vector similarity search"
```

---

### 任务 9：Controllers + 路由

**文件：**
- 创建：`src/knowledge/knowledge.controller.ts`
- 创建：`src/knowledge/document.controller.ts`

- [ ] **步骤 1：KnowledgeController**

```typescript
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { CreateKnowledgeBaseDto } from './dto/create-knowledge-base.dto';
import { KnowledgeService } from './knowledge.service';
import { RetrievalService } from './retrieval.service';
import { RetrievalQueryDto } from './dto/retrieval-query.dto';

@ApiTags('Knowledge')
@Controller('knowledge')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class KnowledgeController {
  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly retrievalService: RetrievalService
  ) {}

  @Get()
  @ApiOperation({ summary: '获取所有知识库' })
  async findAll(@CurrentUser() user: User) {
    return this.knowledgeService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取知识库详情' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.knowledgeService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: '创建知识库' })
  async create(@CurrentUser() user: User, @Body() dto: CreateKnowledgeBaseDto) {
    return this.knowledgeService.create(user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除知识库' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.knowledgeService.delete(id);
  }

  @Post(':id/retrieval')
  @ApiOperation({ summary: '检索知识库' })
  async search(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RetrievalQueryDto
  ) {
    return this.retrievalService.search(id, dto.query, dto.topK);
  }
}
```

- [ ] **步骤 2：DocumentController**

```typescript
import { Controller, Delete, Get, Param, ParseUUIDPipe, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentService } from './document.service';

@ApiTags('Knowledge - Documents')
@Controller('knowledge/:knowledgeBaseId/documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Get()
  @ApiOperation({ summary: '获取知识库的所有文档' })
  async findAll(@Param('knowledgeBaseId', ParseUUIDPipe) knowledgeBaseId: string) {
    return this.documentService.findByKnowledgeBase(knowledgeBaseId);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取文档详情（含分段）' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentService.findById(id);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  @ApiOperation({ summary: '上传文档' })
  async upload(
    @Param('knowledgeBaseId', ParseUUIDPipe) knowledgeBaseId: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.documentService.upload(knowledgeBaseId, file.originalname, file.buffer);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除文档' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentService.delete(id);
  }
}
```

- [ ] **步骤 3：安装 Multer 类型**

```bash
pnpm add -D @types/multer
```

- [ ] **步骤 4：构建验证**

```bash
cd F:/project/nest/base_nest && pnpm run build
```

- [ ] **步骤 5：运行所有测试**

```bash
cd F:/project/nest/base_nest && pnpm run test
```

- [ ] **步骤 6：Commit**

```bash
git add src/knowledge/ pnpm-lock.yaml package.json
git commit -m "feat: implement Knowledge and Document controllers with upload and retrieval APIs"
```

---

## 验证清单

- [ ] `pnpm run test` — 所有测试通过
- [ ] `pnpm run build` — 构建成功
- [ ] `pnpm run lint` — 无 ESLint 错误
- [ ] 应用启动后可以创建知识库
- [ ] 上传文档后状态从 pending → processing → completed
- [ ] 检索 API 返回语义相关结果
- [ ] Chroma 中确认向量已写入
