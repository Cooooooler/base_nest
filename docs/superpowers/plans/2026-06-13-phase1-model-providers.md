# 阶段一：模型提供商与密钥管理 — 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 搭建 AI 模型管理模块，支持多提供商（OpenAI、Anthropic、Ollama等）的密钥管理和统一调用接口。

**架构：** `ProvidersModule` 采用策略模式 — `LlmProvider` 接口定义统一契约，各 SDK 适配器实现该接口。ApiKey 使用 AES-256-GCM 加密存储。实体按 NestJS + TypeORM 模式组织。

**技术栈：** NestJS 11, TypeORM, Postgres, `openai` SDK, `@anthropic-ai/sdk`, Node.js `crypto` 模块

---

## 文件结构

### 创建的文件

```
src/
  providers/
    providers.module.ts
    providers.service.ts
    providers.service.spec.ts
    providers.controller.ts
    providers.controller.spec.ts
    entities/
      model-provider.entity.ts
      api-key.entity.ts
      model.entity.ts
    dto/
      create-provider.dto.ts
      update-provider.dto.ts
      create-api-key.dto.ts
    interfaces/
      llm-provider.interface.ts
    strategies/
      openai.strategy.ts
      claude.strategy.ts
      ollama.strategy.ts
      openai-compatible.strategy.ts
  common/
    crypto.util.ts
    crypto.util.spec.ts
test/
  providers.e2e-spec.ts
```

### 修改的文件

- `src/app.module.ts` — 注册 ProvidersModule
- `.env.example` — 新增 ENCRYPTION_KEY

---

### 任务 1：安装依赖包

- [ ] **步骤 1：安装 LLM SDK 包**

```bash
pnpm add openai @anthropic-ai/sdk
```

- [ ] **步骤 2：Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add openai and anthropic SDK dependencies"
```

---

### 任务 2：加密工具函数

**文件：**
- 创建：`src/common/crypto.util.ts`
- 测试：`src/common/crypto.util.spec.ts`

- [ ] **步骤 1：编写失败的测试**

```typescript
import { encrypt, decrypt } from './crypto.util';

describe('CryptoUtil', () => {
  const originalKey = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef'; // 32 hex bytes
  });

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalKey;
  });

  it('should encrypt and decrypt a string', () => {
    const plaintext = 'sk-proj-xxxxxxxxxxxx';
    const encrypted = encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted).toContain(':'); // iv:ciphertext format

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('should produce different ciphertexts for same plaintext (IV randomness)', () => {
    const plaintext = 'same-key';
    const a = encrypt(plaintext);
    const b = encrypt(plaintext);
    expect(a).not.toBe(b);
  });

  it('should throw if ENCRYPTION_KEY is not set', () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY is not set');
  });

  it('should throw if encrypted format is invalid', () => {
    expect(() => decrypt('invalid-format')).toThrow('Invalid encrypted text format');
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`pnpm run test -- crypto.util.spec.ts`
预期：FAIL，4 tests fail（未定义模块）

- [ ] **步骤 3：编写最少实现代码**

```typescript
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY is not set');
  }
  // Support both 32-byte raw keys and 64-char hex keys
  return key.length === 64 ? Buffer.from(key, 'hex') : Buffer.from(key);
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }

  const [ivHex, tagHex, encrypted] = parts;
  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm run test -- crypto.util.spec.ts`
预期：PASS，4 tests pass

- [ ] **步骤 5：Commit**

```bash
git add src/common/crypto.util.ts src/common/crypto.util.spec.ts
git commit -m "feat: add AES-256-GCM encryption utility for API key storage"
```

---

### 任务 3：实体定义

**文件：**
- 创建：`src/providers/entities/model-provider.entity.ts`
- 创建：`src/providers/entities/api-key.entity.ts`
- 创建：`src/providers/entities/model.entity.ts`

- [ ] **步骤 1：编写 ModelProvider 实体**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ApiKey } from './api-key.entity';
import { Model } from './model.entity';

export type ProviderType = 'openai' | 'anthropic' | 'ollama' | 'openai-compatible';

@Entity('model_providers')
export class ModelProvider {
  @ApiProperty({ format: 'uuid', description: '提供商唯一标识' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ example: 'OpenAI', description: '提供商名称' })
  @Column({ length: 100 })
  name: string;

  @ApiProperty({ example: 'openai', description: '提供商类型', enum: ['openai', 'anthropic', 'ollama', 'openai-compatible'] })
  @Column({ length: 50 })
  type: ProviderType;

  @ApiProperty({ example: true, description: '是否启用' })
  @Column({ default: true })
  isEnabled: boolean;

  @ApiProperty({ example: 'https://api.openai.com/v1', description: '自定义端点' })
  @Column({ length: 500, nullable: true })
  baseUrl: string | null;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => ApiKey, (key) => key.provider)
  apiKeys: ApiKey[];

  @OneToMany(() => Model, (model) => model.provider)
  models: Model[];
}
```

- [ ] **步骤 2：编写 ApiKey 实体**

```typescript
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ModelProvider } from './model-provider.entity';

@Entity('api_keys')
export class ApiKey {
  @ApiProperty({ format: 'uuid', description: '密钥唯一标识' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: '关联提供商 ID' })
  @Column()
  providerId: string;

  @ApiProperty({ example: '生产 Key', description: '密钥别名' })
  @Column({ length: 100 })
  name: string;

  @Exclude()
  @Column({ length: 500 })
  encryptedKey: string;

  @ApiProperty({ example: 'sk-****abc', description: '脱敏显示的密钥' })
  @Column({ length: 50 })
  maskedKey: string;

  @ApiProperty({ example: true, description: '是否启用' })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => ModelProvider, (provider) => provider.apiKeys)
  @JoinColumn({ name: 'providerId' })
  provider: ModelProvider;
}
```

- [ ] **步骤 3：编写 Model 实体**

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ModelProvider } from './model-provider.entity';

@Entity('models')
export class Model {
  @ApiProperty({ format: 'uuid', description: '模型唯一标识' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: '关联提供商 ID' })
  @Column()
  providerId: string;

  @ApiProperty({ example: 'gpt-4o', description: '模型标识名' })
  @Column({ length: 100 })
  name: string;

  @ApiProperty({ example: 'GPT-4o', description: '模型展示名' })
  @Column({ length: 200 })
  displayName: string;

  @ApiProperty({ example: 128000, description: '上下文窗口大小' })
  @Column({ default: 0 })
  contextWindow: number;

  @ApiProperty({ example: 4096, description: '最大输出长度' })
  @Column({ default: 0 })
  maxOutput: number;

  @ApiProperty({ example: { streaming: true, functionCalling: true, vision: true }, description: '模型能力' })
  @Column({ type: 'jsonb', default: {} })
  capabilities: Record<string, boolean>;

  @ApiProperty({ example: true, description: '是否预定义模型' })
  @Column({ default: false })
  isBuiltin: boolean;

  @ApiProperty({ description: '创建时间' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => ModelProvider, (provider) => provider.models)
  @JoinColumn({ name: 'providerId' })
  provider: ModelProvider;
}
```

- [ ] **步骤 4：创建数据库迁移**

运行：`pnpm run migration:generate -- src/database/migrations/CreateProvidersTables`

验证生成的迁移文件包含三个表：
- `model_providers`
- `api_keys`（含 `providerId` 外键）
- `models`（含 `providerId` 外键）

- [ ] **步骤 5：运行迁移**

运行：`pnpm run build && pnpm run migration:run`
预期：3 queries executed，三张表创建成功

- [ ] **步骤 6：Commit**

```bash
git add src/providers/entities/ src/database/migrations/
git commit -m "feat: add ModelProvider, ApiKey, Model entities and migration"
```

---

### 任务 3：ProvidersModule 基础结构

**文件：**
- 创建：`src/providers/providers.module.ts`
- 修改：`src/app.module.ts`

- [ ] **步骤 1：创建 ProvidersModule**

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModelProvider } from './entities/model-provider.entity';
import { ApiKey } from './entities/api-key.entity';
import { Model } from './entities/model.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ModelProvider, ApiKey, Model])],
  controllers: [],
  providers: [],
  exports: [],
})
export class ProvidersModule {}
```

- [ ] **步骤 2：在 AppModule 中注册**

在 `src/app.module.ts` 的 imports 数组最后添加 `ProvidersModule`：

```typescript
import { ProvidersModule } from './providers/providers.module';

// imports: [
//   ...,
//   ProvidersModule,
// ]
```

- [ ] **步骤 3：Commit**

```bash
git add src/providers/providers.module.ts src/app.module.ts
git commit -m "feat: scaffold ProvidersModule and register in AppModule"
```

---

### 任务 4：LLM Provider 统一接口

**文件：**
- 创建：`src/providers/interfaces/llm-provider.interface.ts`

- [ ] **步骤 1：定义接口**

```typescript
import { Observable } from 'rxjs';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatParams {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ChatChunk {
  content: string;
  isEnd: boolean;
  model?: string;
}

export interface LlmProvider {
  chat(params: ChatParams): Promise<ChatResponse>;
  chatStream(params: ChatParams): Observable<ChatChunk>;
  embed?(texts: string[]): Promise<number[][]>;
}

export type LlmProviderType = 'openai' | 'anthropic' | 'ollama' | 'openai-compatible';
```

- [ ] **步骤 2：Commit**

```bash
git add src/providers/interfaces/llm-provider.interface.ts
git commit -m "feat: define LlmProvider interface and shared types"
```

---

### 任务 5：OpenAI 策略

**文件：**
- 创建：`src/providers/strategies/openai.strategy.ts`

- [ ] **步骤 1：编写 OpenAI 策略**

```typescript
import OpenAI from 'openai';
import { Observable, from, map } from 'rxjs';
import { LlmProvider, ChatParams, ChatResponse, ChatChunk } from '../interfaces/llm-provider.interface';

export class OpenAiStrategy implements LlmProvider {
  private client: OpenAI;

  constructor(private readonly apiKey: string, baseUrl?: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: baseUrl || 'https://api.openai.com/v1',
    });
  }

  async chat(params: ChatParams): Promise<ChatResponse> {
    const response = await this.client.chat.completions.create({
      model: params.model,
      messages: params.messages.map(({ role, content }) => ({ role, content })),
      temperature: params.temperature,
      max_tokens: params.maxTokens,
    });

    return {
      content: response.choices[0]?.message?.content || '',
      model: response.model,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }

  chatStream(params: ChatParams): Observable<ChatChunk> {
    return from(
      this.client.chat.completions.create({
        model: params.model,
        messages: params.messages.map(({ role, content }) => ({ role, content })),
        temperature: params.temperature,
        max_tokens: params.maxTokens,
        stream: true,
      })
    ).pipe(
      map((chunk) => ({
        content: chunk.choices[0]?.delta?.content || '',
        isEnd: chunk.choices[0]?.finish_reason === 'stop',
        model: chunk.model,
      }))
    );
  }

  async embed(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
    });
    return response.data.map((item) => item.embedding);
  }
}
```

- [ ] **步骤 2：Commit**

```bash
git add src/providers/strategies/openai.strategy.ts
git commit -m "feat: implement OpenAI strategy"
```

---

### 任务 6：Anthropic 策略

**文件：**
- 创建：`src/providers/strategies/claude.strategy.ts`

- [ ] **步骤 1：编写 Claude 策略**

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { Observable, from, map } from 'rxjs';
import { LlmProvider, ChatParams, ChatResponse, ChatChunk } from '../interfaces/llm-provider.interface';

export class ClaudeStrategy implements LlmProvider {
  private client: Anthropic;

  constructor(private readonly apiKey: string, baseUrl?: string) {
    this.client = new Anthropic({
      apiKey,
      baseURL: baseUrl || undefined,
    });
  }

  async chat(params: ChatParams): Promise<ChatResponse> {
    const systemMsg = params.messages.find((m) => m.role === 'system');
    const nonSystemMessages = params.messages
      .filter((m) => m.role !== 'system')
      .map(({ role, content }) => ({
        role: role as 'user' | 'assistant',
        content,
      }));

    const response = await this.client.messages.create({
      model: params.model,
      messages: nonSystemMessages,
      system: systemMsg?.content,
      temperature: params.temperature,
      max_tokens: params.maxTokens || 4096,
    });

    const contentBlock = response.content[0];

    return {
      content: contentBlock?.type === 'text' ? contentBlock.text : '',
      model: response.model,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }

  chatStream(params: ChatParams): Observable<ChatChunk> {
    const systemMsg = params.messages.find((m) => m.role === 'system');
    const nonSystemMessages = params.messages
      .filter((m) => m.role !== 'system')
      .map(({ role, content }) => ({
        role: role as 'user' | 'assistant',
        content,
      }));

    return from(
      this.client.messages.stream({
        model: params.model,
        messages: nonSystemMessages,
        system: systemMsg?.content,
        temperature: params.temperature,
        max_tokens: params.maxTokens || 4096,
      })
    ).pipe(
      map((stream) => ({
        content: (stream as any).delta?.text || '',
        isEnd: (stream as any).type === 'message_stop',
        model: params.model,
      }))
    );
  }
}
```

- [ ] **步骤 2：Commit**

```bash
git add src/providers/strategies/claude.strategy.ts
git commit -m "feat: implement Anthropic Claude strategy"
```

---

### 任务 7：Ollama 和 OpenAI-compatible 策略

**文件：**
- 创建：`src/providers/strategies/ollama.strategy.ts`
- 创建：`src/providers/strategies/openai-compatible.strategy.ts`

- [ ] **步骤 1：编写 Ollama 策略**

Ollama 使用纯 HTTP 调用（无需 SDK），因为它兼容 OpenAI 的 `/v1/chat/completions` 端点：

```typescript
import { Observable, from, map } from 'rxjs';
import { LlmProvider, ChatParams, ChatResponse, ChatChunk } from '../interfaces/llm-provider.interface';

export class OllamaStrategy implements LlmProvider {
  private baseUrl: string;

  constructor(_apiKey: string, baseUrl?: string) {
    this.baseUrl = (baseUrl || 'http://localhost:11434').replace(/\/$/, '');
  }

  async chat(params: ChatParams): Promise<ChatResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages.map(({ role, content }) => ({ role, content })),
        options: {
          temperature: params.temperature,
          num_predict: params.maxTokens,
        },
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.message?.content || '',
      model: data.model,
    };
  }

  chatStream(params: ChatParams): Observable<ChatChunk> {
    return new Observable<ChatChunk>((subscriber) => {
      (async () => {
        try {
          const response = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: params.model,
              messages: params.messages.map(({ role, content }) => ({ role, content })),
              options: {
                temperature: params.temperature,
                num_predict: params.maxTokens,
              },
              stream: true,
            }),
          });

          if (!response.ok) {
            subscriber.error(new Error(`Ollama stream request failed: ${response.status}`));
            return;
          }

          const reader = response.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const data = JSON.parse(line);
                subscriber.next({
                  content: data.message?.content || '',
                  isEnd: data.done === true,
                  model: data.model,
                });
              } catch {
                // skip malformed lines
              }
            }
          }

          subscriber.complete();
        } catch (err) {
          subscriber.error(err);
        }
      })();
    });
  }
}
```

- [ ] **步骤 2：编写 OpenAI-compatible 策略**

此策略复用 OpenAI SDK，只需覆盖 baseUrl：

```typescript
import { OpenAiStrategy } from './openai.strategy';

export class OpenAiCompatibleStrategy extends OpenAiStrategy {
  constructor(apiKey: string, baseUrl: string) {
    super(apiKey, baseUrl);
  }
}
```

- [ ] **步骤 3：Commit**

```bash
git add src/providers/strategies/ollama.strategy.ts src/providers/strategies/openai-compatible.strategy.ts
git commit -m "feat: implement Ollama and OpenAI-compatible strategies"
```

---

### 任务 8：ProvidersService

**文件：**
- 创建：`src/providers/providers.service.ts`
- 创建：`src/providers/providers.service.spec.ts`
- 创建：`src/providers/dto/create-provider.dto.ts`
- 创建：`src/providers/dto/update-provider.dto.ts`
- 创建：`src/providers/dto/create-api-key.dto.ts`

- [ ] **步骤 1：编写 DTO**

`src/providers/dto/create-provider.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CreateProviderDto {
  @ApiProperty({ example: 'OpenAI', description: '提供商名称' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'openai', enum: ['openai', 'anthropic', 'ollama', 'openai-compatible'] })
  @IsEnum(['openai', 'anthropic', 'ollama', 'openai-compatible'] as const)
  type: 'openai' | 'anthropic' | 'ollama' | 'openai-compatible';

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiProperty({ example: 'https://api.openai.com/v1', required: false })
  @IsOptional()
  @IsString()
  baseUrl?: string;
}
```

`src/providers/dto/update-provider.dto.ts`:

```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateProviderDto } from './create-provider.dto';

export class UpdateProviderDto extends PartialType(CreateProviderDto) {}
```

`src/providers/dto/create-api-key.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({ example: '生产 Key', description: '密钥别名' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'sk-proj-xxxxxxxxxxxx', description: 'API 密钥原文' })
  @IsString()
  @MinLength(1)
  apiKey: string;
}
```

- [ ] **步骤 2：编写 ProvidersService 测试**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ModelProvider } from './entities/model-provider.entity';
import { ApiKey } from './entities/api-key.entity';
import { Model } from './entities/model.entity';
import { ProvidersService } from './providers.service';
import * as cryptoUtil from '../common/crypto.util';

jest.mock('../common/crypto.util');

describe('ProvidersService', () => {
  let service: ProvidersService;
  let providerRepo: jest.Mocked<Repository<ModelProvider>>;
  let apiKeyRepo: jest.Mocked<Repository<ApiKey>>;
  let modelRepo: jest.Mocked<Repository<Model>>;

  const mockProvider: ModelProvider = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'OpenAI',
    type: 'openai',
    isEnabled: true,
    baseUrl: null,
    createdAt: new Date(),
    apiKeys: [],
    models: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProvidersService,
        { provide: getRepositoryToken(ModelProvider), useValue: { find: jest.fn(), findOneBy: jest.fn(), create: jest.fn(), save: jest.fn(), delete: jest.fn() } },
        { provide: getRepositoryToken(ApiKey), useValue: { find: jest.fn(), findOneBy: jest.fn(), create: jest.fn(), save: jest.fn(), delete: jest.fn() } },
        { provide: getRepositoryToken(Model), useValue: { find: jest.fn(), findOneBy: jest.fn(), create: jest.fn(), save: jest.fn(), delete: jest.fn() } },
      ],
    }).compile();

    service = module.get<ProvidersService>(ProvidersService);
    providerRepo = module.get(getRepositoryToken(ModelProvider));
    apiKeyRepo = module.get(getRepositoryToken(ApiKey));
    modelRepo = module.get(getRepositoryToken(Model));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllProviders', () => {
    it('should return all providers with relations', async () => {
      providerRepo.find.mockResolvedValue([mockProvider]);
      const result = await service.findAllProviders();
      expect(result).toEqual([mockProvider]);
      expect(providerRepo.find).toHaveBeenCalledWith({ relations: ['apiKeys', 'models'] });
    });
  });

  describe('findProviderById', () => {
    it('should return a provider by id', async () => {
      providerRepo.findOneBy.mockResolvedValue(mockProvider);
      const result = await service.findProviderById(mockProvider.id);
      expect(result).toEqual(mockProvider);
      expect(providerRepo.findOneBy).toHaveBeenCalledWith({ id: mockProvider.id });
    });

    it('should return null if not found', async () => {
      providerRepo.findOneBy.mockResolvedValue(null);
      const result = await service.findProviderById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('createProvider', () => {
    it('should create and return a provider', async () => {
      const dto = { name: 'OpenAI', type: 'openai' as const };
      providerRepo.create.mockReturnValue(mockProvider);
      providerRepo.save.mockResolvedValue(mockProvider);

      const result = await service.createProvider(dto);
      expect(result).toEqual(mockProvider);
      expect(providerRepo.create).toHaveBeenCalledWith(dto);
      expect(providerRepo.save).toHaveBeenCalled();
    });
  });

  describe('updateProvider', () => {
    it('should update and return a provider', async () => {
      providerRepo.findOneBy.mockResolvedValue(mockProvider);
      const updateDto = { name: 'OpenAI Updated' };
      const updated = { ...mockProvider, name: 'OpenAI Updated' };
      providerRepo.save.mockResolvedValue(updated);

      const result = await service.updateProvider(mockProvider.id, updateDto);
      expect(result).toEqual(updated);
      expect(providerRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if provider not found', async () => {
      providerRepo.findOneBy.mockResolvedValue(null);
      await expect(service.updateProvider('nonexistent', { name: 'test' })).rejects.toThrow('Provider not found');
    });
  });

  describe('deleteProvider', () => {
    it('should delete a provider', async () => {
      providerRepo.delete.mockResolvedValue({ affected: 1, raw: {} });
      await service.deleteProvider(mockProvider.id);
      expect(providerRepo.delete).toHaveBeenCalledWith(mockProvider.id);
    });
  });

  describe('createApiKey', () => {
    it('should encrypt and save an API key', async () {
      const dto = { name: 'Production', apiKey: 'sk-proj-xxx' };
      (cryptoUtil.encrypt as jest.Mock).mockReturnValue('encrypted:value');
      providerRepo.findOneBy.mockResolvedValue(mockProvider);

      const savedKey: ApiKey = {
        id: 'uuid',
        providerId: mockProvider.id,
        name: dto.name,
        encryptedKey: 'encrypted:value',
        maskedKey: 'sk-p****xxx',
        isActive: true,
        createdAt: new Date(),
        provider: mockProvider,
      };
      apiKeyRepo.create.mockReturnValue(savedKey);
      apiKeyRepo.save.mockResolvedValue(savedKey);

      const result = await service.createApiKey(mockProvider.id, dto);
      expect(cryptoUtil.encrypt).toHaveBeenCalledWith(dto.apiKey);
      expect(apiKeyRepo.create).toHaveBeenCalled();
      expect(apiKeyRepo.save).toHaveBeenCalled();
      // maskedKey should hide most of the key
      expect(result.maskedKey).toBeDefined();
      expect(result.maskedKey).not.toContain('sk-proj');
    });
  });

  describe('getProviderClient', () => {
    it('should return an OpenAI strategy for openai type', async () => {
      (cryptoUtil.decrypt as jest.Mock).mockReturnValue('sk-test');
      providerRepo.findOneBy.mockResolvedValue(mockProvider);

      const result = await service.getProviderClient('provider-id');
      expect(result).toBeDefined();
    });
  });
});
```

- [ ] **步骤 3：运行测试验证失败**

运行：`pnpm run test -- providers.service.spec.ts`
预期：FAIL（未定义）

- [ ] **步骤 4：编写 ProvidersService**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { encrypt, decrypt } from '../common/crypto.util';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ApiKey } from './entities/api-key.entity';
import { Model } from './entities/model.entity';
import { ModelProvider } from './entities/model-provider.entity';
import { LlmProvider } from './interfaces/llm-provider.interface';
import { OpenAiStrategy } from './strategies/openai.strategy';
import { ClaudeStrategy } from './strategies/claude.strategy';
import { OllamaStrategy } from './strategies/ollama.strategy';
import { OpenAiCompatibleStrategy } from './strategies/openai-compatible.strategy';

function maskApiKey(key: string): string {
  if (key.length <= 8) return '****';
  return key.substring(0, 4) + '****' + key.substring(key.length - 3);
}

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(ModelProvider)
    private readonly providerRepo: Repository<ModelProvider>,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepo: Repository<ApiKey>,
    @InjectRepository(Model)
    private readonly modelRepo: Repository<Model>
  ) {}

  // ========== Provider CRUD ==========

  async findAllProviders(): Promise<ModelProvider[]> {
    return this.providerRepo.find({ relations: ['apiKeys', 'models'] });
  }

  async findProviderById(id: string): Promise<ModelProvider | null> {
    return this.providerRepo.findOne({
      where: { id },
      relations: ['apiKeys', 'models'],
    });
  }

  async createProvider(dto: CreateProviderDto): Promise<ModelProvider> {
    const provider = this.providerRepo.create(dto);
    return this.providerRepo.save(provider);
  }

  async updateProvider(id: string, dto: UpdateProviderDto): Promise<ModelProvider> {
    const provider = await this.providerRepo.findOneBy({ id });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }
    Object.assign(provider, dto);
    return this.providerRepo.save(provider);
  }

  async deleteProvider(id: string): Promise<void> {
    await this.providerRepo.delete(id);
  }

  // ========== API Key Management ==========

  async findApiKeys(providerId: string): Promise<ApiKey[]> {
    return this.apiKeyRepo.find({ where: { providerId } });
  }

  async createApiKey(providerId: string, dto: CreateApiKeyDto): Promise<ApiKey> {
    const provider = await this.providerRepo.findOneBy({ id: providerId });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const encryptedKey = encrypt(dto.apiKey);
    const apiKey = this.apiKeyRepo.create({
      providerId,
      name: dto.name,
      encryptedKey,
      maskedKey: maskApiKey(dto.apiKey),
    });

    return this.apiKeyRepo.save(apiKey);
  }

  async deleteApiKey(id: string): Promise<void> {
    await this.apiKeyRepo.delete(id);
  }

  // ========== Model Management ==========

  async findModels(providerId: string): Promise<Model[]> {
    return this.modelRepo.find({ where: { providerId } });
  }

  // ========== Client Factory ==========

  async getProviderClient(providerId: string): Promise<LlmProvider> {
    const provider = await this.providerRepo.findOne({
      where: { id: providerId, isEnabled: true },
      relations: ['apiKeys'],
    });

    if (!provider || provider.apiKeys.length === 0) {
      throw new NotFoundException('No enabled provider or API key found');
    }

    const activeKey = provider.apiKeys.find((k) => k.isActive);
    if (!activeKey) {
      throw new NotFoundException('No active API key found');
    }

    const decryptedKey = decrypt(activeKey.encryptedKey);

    switch (provider.type) {
      case 'openai':
        return new OpenAiStrategy(decryptedKey, provider.baseUrl ?? undefined);
      case 'anthropic':
        return new ClaudeStrategy(decryptedKey, provider.baseUrl ?? undefined);
      case 'ollama':
        return new OllamaStrategy(decryptedKey, provider.baseUrl ?? undefined);
      case 'openai-compatible':
        return new OpenAiCompatibleStrategy(decryptedKey, provider.baseUrl ?? '');
      default:
        throw new Error(`Unsupported provider type: ${provider.type}`);
    }
  }
}
```

- [ ] **步骤 5：运行测试验证通过**

运行：`pnpm run test -- providers.service.spec.ts`
预期：PASS

- [ ] **步骤 6：Commit**

```bash
git add src/providers/providers.service.ts src/providers/providers.service.spec.ts src/providers/dto/
git commit -m "feat: implement ProvidersService with CRUD and client factory"
```

---

### 任务 9：ProvidersController

**文件：**
- 创建：`src/providers/providers.controller.ts`
- 创建：`src/providers/providers.controller.spec.ts`

- [ ] **步骤 1：编写 Controller 测试**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

describe('ProvidersController', () => {
  let controller: ProvidersController;

  const mockService = {
    findAllProviders: jest.fn().mockResolvedValue([]),
    findProviderById: jest.fn().mockResolvedValue({ id: 'test-id' }),
    createProvider: jest.fn().mockResolvedValue({ id: 'new-id' }),
    updateProvider: jest.fn().mockResolvedValue({ id: 'updated-id' }),
    deleteProvider: jest.fn().mockResolvedValue(undefined),
    findApiKeys: jest.fn().mockResolvedValue([]),
    createApiKey: jest.fn().mockResolvedValue({ id: 'key-id', maskedKey: 'sk-***' }),
    deleteApiKey: jest.fn().mockResolvedValue(undefined),
    findModels: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProvidersController],
      providers: [{ provide: ProvidersService, useValue: mockService }],
    }).compile();

    controller = module.get<ProvidersController>(ProvidersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll should return all providers', async () => {
    const result = await controller.findAll();
    expect(result).toEqual([]);
    expect(mockService.findAllProviders).toHaveBeenCalled();
  });

  it('findOne should return a provider', async () => {
    const result = await controller.findOne('test-id');
    expect(result).toEqual({ id: 'test-id' });
    expect(mockService.findProviderById).toHaveBeenCalledWith('test-id');
  });

  it('create should create a provider', async () => {
    const dto: CreateProviderDto = { name: 'OpenAI', type: 'openai' };
    const result = await controller.create(dto);
    expect(result).toEqual({ id: 'new-id' });
    expect(mockService.createProvider).toHaveBeenCalledWith(dto);
  });

  it('update should update a provider', async () => {
    const dto = { name: 'Updated' };
    const result = await controller.update('test-id', dto);
    expect(result).toEqual({ id: 'updated-id' });
    expect(mockService.updateProvider).toHaveBeenCalledWith('test-id', dto);
  });

  it('remove should delete a provider', async () => {
    await controller.remove('test-id');
    expect(mockService.deleteProvider).toHaveBeenCalledWith('test-id');
  });

  it('findApiKeys should return keys for a provider', async () => {
    const result = await controller.findApiKeys('provider-id');
    expect(result).toEqual([]);
    expect(mockService.findApiKeys).toHaveBeenCalledWith('provider-id');
  });

  it('createApiKey should create a key', async () => {
    const dto: CreateApiKeyDto = { name: 'prod', apiKey: 'sk-xxx' };
    const result = await controller.createApiKey('provider-id', dto);
    expect(result).toEqual({ id: 'key-id', maskedKey: 'sk-***' });
    expect(mockService.createApiKey).toHaveBeenCalledWith('provider-id', dto);
  });

  it('removeApiKey should delete a key', async () => {
    await controller.removeApiKey('key-id');
    expect(mockService.deleteApiKey).toHaveBeenCalledWith('key-id');
  });

  it('findModels should return models for a provider', async () => {
    const result = await controller.findModels('provider-id');
    expect(result).toEqual([]);
    expect(mockService.findModels).toHaveBeenCalledWith('provider-id');
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

运行：`pnpm run test -- providers.controller.spec.ts`
预期：FAIL

- [ ] **步骤 3：编写 Controller**

```typescript
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { ProvidersService } from './providers.service';

@ApiTags('Providers')
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  // ========== Providers ==========

  @Get()
  @ApiOperation({ summary: '获取所有模型提供商' })
  async findAll() {
    return this.providersService.findAllProviders();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取提供商详情' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.providersService.findProviderById(id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建模型提供商' })
  async create(@Body() dto: CreateProviderDto) {
    return this.providersService.createProvider(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新模型提供商' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProviderDto) {
    return this.providersService.updateProvider(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除模型提供商' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.providersService.deleteProvider(id);
  }

  // ========== API Keys ==========

  @Get(':id/keys')
  @ApiOperation({ summary: '获取提供商的所有 API 密钥' })
  async findApiKeys(@Param('id', ParseUUIDPipe) id: string) {
    return this.providersService.findApiKeys(id);
  }

  @Post(':id/keys')
  @ApiBearerAuth()
  @ApiOperation({ summary: '添加 API 密钥' })
  async createApiKey(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateApiKeyDto) {
    return this.providersService.createApiKey(id, dto);
  }

  @Delete('keys/:keyId')
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除 API 密钥' })
  async removeApiKey(@Param('keyId', ParseUUIDPipe) keyId: string) {
    return this.providersService.deleteApiKey(keyId);
  }

  // ========== Models ==========

  @Get(':id/models')
  @ApiOperation({ summary: '获取提供商支持的模型列表' })
  async findModels(@Param('id', ParseUUIDPipe) id: string) {
    return this.providersService.findModels(id);
  }
}
```

- [ ] **步骤 4：运行测试验证通过**

运行：`pnpm run test -- providers.controller.spec.ts`
预期：PASS

- [ ] **步骤 5：将 Controller 注册到 Module**

更新 `src/providers/providers.module.ts`：

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModelProvider } from './entities/model-provider.entity';
import { ApiKey } from './entities/api-key.entity';
import { Model } from './entities/model.entity';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';

@Module({
  imports: [TypeOrmModule.forFeature([ModelProvider, ApiKey, Model])],
  controllers: [ProvidersController],
  providers: [ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
```

- [ ] **步骤 6：Commit**

```bash
git add src/providers/providers.controller.ts src/providers/providers.controller.spec.ts src/providers/providers.module.ts
git commit -m "feat: implement ProvidersController with CRUD endpoints"
```

---

### 任务 10：E2E 测试和验证

**文件：**
- 创建：`test/providers.e2e-spec.ts`

- [ ] **步骤 1：编写 E2E 测试**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor } from '@nestjs/common';

describe('Providers (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })
    );
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /providers should return empty array initially', async () => {
    const res = await request(app.getHttpServer()).get('/providers');
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(1);
    expect(res.body.data).toEqual([]);
  });

  it('POST /providers should create a new provider', async () => {
    const res = await request(app.getHttpServer())
      .post('/providers')
      .send({ name: 'OpenAI', type: 'openai' });
    expect(res.status).toBe(201);
    expect(res.body.code).toBe(1);
    expect(res.body.data.name).toBe('OpenAI');
    expect(res.body.data.type).toBe('openai');
  });

  it('POST /providers should validate required fields', async () => {
    const res = await request(app.getHttpServer())
      .post('/providers')
      .send({ name: 'Test' }); // missing type
    expect(res.status).toBe(400);
  });

  it('GET /providers/:id should return a provider', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/providers')
      .send({ name: 'Anthropic', type: 'anthropic' });

    const providerId = createRes.body.data.id;
    const res = await request(app.getHttpServer()).get(`/providers/${providerId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Anthropic');
  });

  it('PATCH /providers/:id should update a provider', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/providers')
      .send({ name: 'Ollama', type: 'ollama' });

    const providerId = createRes.body.data.id;
    const res = await request(app.getHttpServer())
      .patch(`/providers/${providerId}`)
      .send({ baseUrl: 'http://localhost:11434' });
    expect(res.status).toBe(200);
    expect(res.body.data.baseUrl).toBe('http://localhost:11434');
  });

  it('DELETE /providers/:id should delete a provider', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/providers')
      .send({ name: 'Temp', type: 'openai-compatible' });

    const providerId = createRes.body.data.id;
    const res = await request(app.getHttpServer()).delete(`/providers/${providerId}`);
    expect(res.status).toBe(200);
  });

  it('POST /providers/:id/keys should create an API key', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/providers')
      .send({ name: 'KeyTest', type: 'openai' });

    const providerId = createRes.body.data.id;
    const res = await request(app.getHttpServer())
      .post(`/providers/${providerId}/keys`)
      .send({ name: 'test-key', apiKey: 'sk-proj-test1234567890' });
    expect(res.status).toBe(201);
    expect(res.body.data.maskedKey).toContain('****');
    expect(res.body.data.encryptedKey).toBeUndefined(); // should not expose encrypted
  });

  it('GET /providers/:id/models should return models list', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/providers')
      .send({ name: 'ModelTest', type: 'openai' });

    const providerId = createRes.body.data.id;
    const res = await request(app.getHttpServer()).get(`/providers/${providerId}/models`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});
```

- [ ] **步骤 2：运行 E2E 测试**

运行：`pnpm run test:e2e -- providers.e2e-spec.ts`
预期：PASS（确保数据库已运行且有 clean 数据）

- [ ] **步骤 3：运行完整测试套件**

运行：`pnpm run test`
预期：所有现有测试 + 新测试均 PASS

- [ ] **步骤 4：Commit**

```bash
git add test/providers.e2e-spec.ts
git commit -m "test: add e2e tests for providers CRUD and API key management"
```

---

### 任务 11：环境变量和文档

**文件：**
- 修改：`.env.example`

- [ ] **步骤 1：更新 .env.example**

在文件末尾添加：

```env
# Encryption
ENCRYPTION_KEY=your-aes-256-key-32bytes-or-64hexchars
```

- [ ] **步骤 2：运行 lint**

运行：`pnpm run lint`
预期：无 lint 错误

- [ ] **步骤 3：Commit**

```bash
git add .env.example
git commit -m "chore: add ENCRYPTION_KEY to env example"
```

---

## 验证清单

- [ ] `pnpm run test` — 所有测试通过（含新单元测试）
- [ ] `pnpm run test:e2e` — E2E 测试通过
- [ ] `pnpm run lint` — 无 ESLint 错误
- [ ] `pnpm run build` — 构建成功
- [ ] 应用启动后 `GET /providers` 返回空数组
- [ ] 创建提供商后可在 `/providers/:id` 查到
- [ ] API Key 加密存储，响应中不暴露原文
