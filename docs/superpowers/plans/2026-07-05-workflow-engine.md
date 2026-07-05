# 工作流引擎实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 实现类 Dify 的 DAG 工作流编排引擎 MVP — 8 种节点类型、拓扑排序+分层并行执行、`{{...}}` 变量解析、调试模式返回中间结果、React Flow 画布编辑器。

**架构：** NestJS 后端模块（CRUD + DAG 引擎 + 节点执行器），JSONB 存储 graph，独立 run/trace 表记录执行历史。前端 React Flow 画布 + NodeConfigPanel + DebugResultPanel。

**技术栈：** NestJS 11 + TypeORM + Postgres (JSONB), React Flow (@xyflow/react), Zustand, Zod

---

### 前置模式参考

- **Entity 模式**: `@PrimaryGeneratedColumn('uuid')`, `@CreateDateColumn()`, 实体在 app.module 中用 `autoLoadEntities: true`
- **Mock 测试模式**: `fromPartial` from `@total-typescript/shoehorn`, `getRepositoryToken(Entity)`, mock guards
- **Module 注册**: TypeOrmModule.forFeature + AuthGuardModule imports, 导出 service
- **LLM 调用**: ProvidersService.getProviderClient(providerId) → `client.chatStream(params)` 返回 Observable<ChatChunk>
- **知识库检索**: RetrievalService.searchWithScore(kbId, query, topK) → `{ content, metadata, score }[]`

---

### 任务 1：数据库迁移文件

**文件：**
- 创建：`apps/api/src/database/migrations/1720000000000-CreateWorkflowTables.ts`

#### 迁移 SQL

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWorkflowTables1720000000000 implements MigrationInterface {
  name = 'CreateWorkflowTables1720000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "workflows" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "description" text,
        "graph" jsonb NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
        "userId" uuid NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workflows" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "workflow_runs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workflowId" uuid NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'running',
        "inputs" jsonb NOT NULL DEFAULT '{}',
        "outputs" jsonb,
        "triggeredBy" character varying(20) NOT NULL DEFAULT 'api',
        "error" text,
        "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "completedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workflow_runs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "workflow_node_executions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "runId" uuid NOT NULL,
        "nodeId" character varying(255) NOT NULL,
        "nodeType" character varying(50) NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'pending',
        "inputs" jsonb,
        "outputs" jsonb,
        "latency" integer,
        "error" text,
        "startedAt" TIMESTAMP WITH TIME ZONE,
        "completedAt" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_workflow_node_executions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_workflow_runs_workflow" ON "workflow_runs" ("workflowId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_workflow_node_executions_run" ON "workflow_node_executions" ("runId")
    `);
    await queryRunner.query(`
      ALTER TABLE "workflow_runs"
        ADD CONSTRAINT "FK_workflow_runs_workflow"
        FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "workflow_node_executions"
        ADD CONSTRAINT "FK_workflow_node_executions_run"
        FOREIGN KEY ("runId") REFERENCES "workflow_runs"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "workflow_node_executions"`);
    await queryRunner.query(`DROP TABLE "workflow_runs"`);
    await queryRunner.query(`DROP TABLE "workflows"`);
  }
}
```

- [ ] **步骤 1：编写迁移文件** — 将上述代码写入 `apps/api/src/database/migrations/1720000000000-CreateWorkflowTables.ts`
- [ ] **步骤 2：运行迁移验证**

```bash
cd apps/api && pnpm run migration:run
# 预期：3 个表被创建，无错误
```

- [ ] **步骤 3：回滚确认**

```bash
cd apps/api && pnpm run migration:revert && pnpm run migration:run
# 预期：回滚成功，重新迁移成功
```

- [ ] **步骤 4：Commit**

```bash
git add apps/api/src/database/migrations/1720000000000-CreateWorkflowTables.ts
git commit -m "feat: add workflow, workflow_run, workflow_node_execution tables"
```

---

### 任务 2：Workflow 实体 + DTOs

**文件：**
- 创建：`apps/api/src/workflow/entities/workflow.entity.ts`
- 创建：`apps/api/src/workflow/entities/workflow-run.entity.ts`
- 创建：`apps/api/src/workflow/entities/workflow-node-execution.entity.ts`
- 创建：`apps/api/src/workflow/dto/create-workflow.dto.ts`
- 创建：`apps/api/src/workflow/dto/update-workflow.dto.ts`
- 创建：`apps/api/src/workflow/dto/execute-workflow.dto.ts`
- 创建：`apps/api/src/workflow/dto/workflow.dto.ts`
- 创建：`apps/api/src/workflow/dto/index.ts`
- 创建：`apps/api/src/workflow/types.ts`

#### 步骤 1：编写实体

```typescript
// apps/api/src/workflow/entities/workflow.entity.ts
import {
  Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';

export interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  config: Record<string, any>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

@Entity('workflows')
export class Workflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('jsonb')
  graph: WorkflowGraph;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

```typescript
// apps/api/src/workflow/entities/workflow-run.entity.ts
import {
  Column, CreateDateColumn, Entity, PrimaryGeneratedColumn,
} from 'typeorm';

export type WorkflowRunStatus = 'running' | 'succeeded' | 'failed' | 'cancelled';
export type WorkflowTrigger = 'api' | 'manual';

@Entity('workflow_runs')
export class WorkflowRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  workflowId: string;

  @Column({ length: 20 })
  status: WorkflowRunStatus;

  @Column('jsonb')
  inputs: Record<string, any>;

  @Column('jsonb', { nullable: true })
  outputs: Record<string, any> | null;

  @Column({ length: 20 })
  triggeredBy: WorkflowTrigger;

  @Column('text', { nullable: true })
  error: string | null;

  @Column('timestamptz')
  startedAt: Date;

  @Column('timestamptz', { nullable: true })
  completedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
```

```typescript
// apps/api/src/workflow/entities/workflow-node-execution.entity.ts
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type NodeExecutionStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'skipped';

@Entity('workflow_node_executions')
export class WorkflowNodeExecution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  runId: string;

  @Column({ length: 255 })
  nodeId: string;

  @Column({ length: 50 })
  nodeType: string;

  @Column({ length: 20 })
  status: NodeExecutionStatus;

  @Column('jsonb', { nullable: true })
  inputs: Record<string, any> | null;

  @Column('jsonb', { nullable: true })
  outputs: Record<string, any> | null;

  @Column('int', { nullable: true })
  latency: number | null;

  @Column('text', { nullable: true })
  error: string | null;

  @Column('timestamptz', { nullable: true })
  startedAt: Date | null;

  @Column('timestamptz', { nullable: true })
  completedAt: Date | null;
}
```

#### 步骤 2：编写 DTOs

```typescript
// apps/api/src/workflow/dto/create-workflow.dto.ts
import { IsOptional, IsString, IsObject, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class GraphNodePosition {
  x: number;
  y: number;
}

class GraphNode {
  @IsString()
  id: string;

  @IsString()
  type: string;

  @IsString()
  label: string;

  @IsObject()
  position: GraphNodePosition;

  @IsObject()
  config: Record<string, any>;
}

class GraphEdge {
  @IsString()
  id: string;

  @IsString()
  source: string;

  @IsString()
  target: string;

  @IsOptional()
  @IsString()
  sourceHandle?: string;
}

class WorkflowGraphDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GraphNode)
  nodes: GraphNode[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GraphEdge)
  edges: GraphEdge[];
}

export class CreateWorkflowDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => WorkflowGraphDto)
  graph: WorkflowGraphDto;
}
```

```typescript
// apps/api/src/workflow/dto/update-workflow.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateWorkflowDto } from './create-workflow.dto';

export class UpdateWorkflowDto extends PartialType(CreateWorkflowDto) {}
```

```typescript
// apps/api/src/workflow/dto/execute-workflow.dto.ts
import { IsObject } from 'class-validator';

export class ExecuteWorkflowDto {
  @IsObject()
  inputs: Record<string, any>;
}
```

```typescript
// apps/api/src/workflow/dto/index.ts
export { CreateWorkflowDto } from './create-workflow.dto';
export { UpdateWorkflowDto } from './update-workflow.dto';
export { ExecuteWorkflowDto } from './execute-workflow.dto';
```

```typescript
// apps/api/src/workflow/types.ts — 共享类型

export type NodeType =
  | 'start'
  | 'end'
  | 'llm'
  | 'code'
  | 'condition'
  | 'http_request'
  | 'knowledge_retrieval'
  | 'question_classifier';

export const NODE_TYPES: NodeType[] = [
  'start', 'end', 'llm', 'code', 'condition',
  'http_request', 'knowledge_retrieval', 'question_classifier',
];

export const GRAPH_VALIDATION_RULES = {
  requiredNodeTypes: ['start', 'end'],
  maxNodes: 100,
  maxEdges: 200,
};
```

#### 步骤 3：编写实体测试

```typescript
// apps/api/src/workflow/entities/workflow.entity.spec.ts
import { Workflow } from './workflow.entity';

describe('Workflow', () => {
  it('should create a workflow instance', () => {
    const wf = new Workflow();
    wf.name = 'Test';
    wf.graph = { nodes: [], edges: [] };
    wf.userId = 'user-1';
    expect(wf).toBeDefined();
    expect(wf.name).toBe('Test');
  });
});
```

```typescript
// apps/api/src/workflow/entities/workflow-run.entity.spec.ts
import { WorkflowRun } from './workflow-run.entity';

describe('WorkflowRun', () => {
  it('should create a run instance', () => {
    const run = new WorkflowRun();
    run.status = 'running';
    run.inputs = { query: 'hello' };
    run.triggeredBy = 'api';
    expect(run.status).toBe('running');
  });
});
```

- [ ] **步骤 1：创建实体目录 + 3 个实体文件**
- [ ] **步骤 2：创建 dto 目录 + 4 个 dto 文件 + 类型文件**
- [ ] **步骤 3：运行测试验证**

```bash
cd apps/api && pnpm run test -- workflow.entity.spec.ts
```

- [ ] **步骤 4：Commit**

```bash
git add apps/api/src/workflow/
git commit -m "feat: add workflow entities and DTOs"
```

---

### 任务 3：ContextService — {{...}} 变量解析引擎

**文件：**
- 创建：`apps/api/src/workflow/engine/context.service.ts`
- 创建：`apps/api/src/workflow/engine/context.service.spec.ts`

- [ ] **步骤 1：编写失败的测试**

```typescript
// apps/api/src/workflow/engine/context.service.spec.ts
import { ContextService } from './context.service';

describe('ContextService', () => {
  it('should store and retrieve inputs', () => {
    const ctx = new ContextService({ query: 'hello' });
    expect(ctx.resolve('{{inputs.query}}')).toBe('hello');
  });

  it('should store node outputs and resolve references', () => {
    const ctx = new ContextService({});
    ctx.setNodeOutput('start', { result: 'output-value' });
    expect(ctx.resolve('{{nodes.start.output}}')).toBe('output-value');
    // 深层字段
    expect(ctx.resolve('{{nodes.start.output.result}}')).toBe('output-value');
  });

  it('should resolve nested object configs', () => {
    const ctx = new ContextService({ name: 'world' });
    const resolved = ctx.resolveConfig({
      prompt: 'Hello {{inputs.name}}',
      settings: { temperature: 0.7, greeting: 'Hi {{inputs.name}}' },
    });
    expect(resolved).toEqual({
      prompt: 'Hello world',
      settings: { temperature: 0.7, greeting: 'Hi world' },
    });
  });

  it('should keep unresolved variables as-is', () => {
    const ctx = new ContextService({});
    expect(ctx.resolve('{{missing.var}}')).toBe('{{missing.var}}');
  });

  it('should getByPath for nested objects', () => {
    const ctx = new ContextService({});
    ctx.setNodeOutput('llm_1', { tokens: { total: 150 } });
    // "nodes.llm_1.tokens.total" is stored as a single key via setNodeOutput
    // so we need to support getByPath on nested values
    expect(ctx.resolve('{{nodes.llm_1.tokens}}')).toBe('[object Object]');
  });
});
```

- [ ] **步骤 2：运行测试验证失败**

```bash
cd apps/api && pnpm run test -- context.service.spec.ts
# 预期：FAIL，Cannot find module
```

- [ ] **步骤 3：编写实现**

```typescript
// apps/api/src/workflow/engine/context.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class ContextService {
  // Flat key-value store: "nodes.start.output" → "hello"
  // "nodes.llm_1.tokens.total" → 150
  private store: Map<string, any> = new Map();

  constructor(inputs: Record<string, any>) {
    this.flatten('inputs', inputs);
  }

  /** Store the full output object. Also flattens sub-keys so getByPath
   *  can resolve nodes.llm_1.tokens and nodes.llm_1.tokens.total both. */
  setNodeOutput(nodeId: string, output: Record<string, any>): void {
    this.store.set(`nodes.${nodeId}.output`, output);
    this.flatten(`nodes.${nodeId}`, output);
  }

  /** Resolve {{path}} in a single template string */
  resolve(template: string): string {
    return template.replace(/\{\{([\w.]+)\}\}/g, (_, path: string) => {
      const value = this.getByPath(path);
      return value !== undefined ? String(value) : `{{${path}}}`;
    });
  }

  /** Recursively walk config values and resolve all string templates */
  resolveConfig(config: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string') {
        result[key] = this.resolve(value);
      } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.resolveConfig(value);
      } else if (Array.isArray(value)) {
        result[key] = value.map(v =>
          typeof v === 'string' ? this.resolve(v) : v
        );
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  /** Create a snapshot for node execution logging */
  snapshot(): Map<string, any> {
    return new Map(this.store);
  }

  private getByPath(path: string): any {
    // Try exact key first
    if (this.store.has(path)) return this.store.get(path);
    // Try prefix match — find the most specific stored prefix
    const parts = path.split('.');
    for (let i = parts.length - 1; i >= 1; i--) {
      const prefix = parts.slice(0, i).join('.');
      const suffix = parts.slice(i).join('.');
      if (this.store.has(prefix)) {
        const obj = this.store.get(prefix);
        if (obj && typeof obj === 'object') {
          const value = suffix.split('.').reduce((o: any, k: string) => o?.[k], obj);
          if (value !== undefined) return value;
        }
      }
    }
    return undefined;
  }

  private flatten(prefix: string, obj: Record<string, any>): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = `${prefix}.${key}`;
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        this.store.set(fullKey, value);
        this.flatten(fullKey, value);
      } else {
        this.store.set(fullKey, value);
      }
    }
  }
}
```

- [ ] **步骤 4：运行测试验证通过**

```bash
cd apps/api && pnpm run test -- context.service.spec.ts
# 预期：PASS (5 tests)
```

- [ ] **步骤 5：Commit**

```bash
git add apps/api/src/workflow/engine/context.service.ts apps/api/src/workflow/engine/context.service.spec.ts
git commit -m "feat: implement ContextService with {{...}} variable resolution"
```

---

### 任务 4：NodeExecutor 接口 + Start/End 执行器

**文件：**
- 创建：`apps/api/src/workflow/engine/executor/node-executor.interface.ts`
- 创建：`apps/api/src/workflow/engine/executor/start-node.executor.ts`
- 创建：`apps/api/src/workflow/engine/executor/end-node.executor.ts`
- 测试：`apps/api/src/workflow/engine/executor/start-node.executor.spec.ts`
- 测试：`apps/api/src/workflow/engine/executor/end-node.executor.spec.ts`

- [ ] **步骤 1：编写接口 + 实现**

```typescript
// apps/api/src/workflow/engine/executor/node-executor.interface.ts
import { ContextService } from '../context.service';

export interface NodeExecutionResult {
  /** Structured output of this node. Stored in context as nodes.{id}.output */
  outputs: Record<string, any>;
  /** Human-readable summary for debug panel */
  summary?: string;
}

export interface NodeExecutor {
  readonly type: string;
  execute(
    nodeId: string,
    config: Record<string, any>,
    context: ContextService,
  ): Promise<NodeExecutionResult>;
}
```

```typescript
// apps/api/src/workflow/engine/executor/start-node.executor.ts
import { Injectable } from '@nestjs/common';
import { NodeExecutor, NodeExecutionResult } from './node-executor.interface';
import { ContextService } from '../context.service';

@Injectable()
export class StartNodeExecutor implements NodeExecutor {
  readonly type = 'start';

  async execute(
    _nodeId: string,
    _config: Record<string, any>,
    context: ContextService,
  ): Promise<NodeExecutionResult> {
    // The context already has inputs stored; just expose them as output
    const inputs = context.resolve('{{inputs}}');
    return { outputs: typeof inputs === 'string' ? { value: inputs } : (inputs as Record<string, any> || {}) };
  }
}
```

```typescript
// apps/api/src/workflow/engine/executor/end-node.executor.ts
import { Injectable } from '@nestjs/common';
import { NodeExecutor, NodeExecutionResult } from './node-executor.interface';
import { ContextService } from '../context.service';

@Injectable()
export class EndNodeExecutor implements NodeExecutor {
  readonly type = 'end';

  async execute(
    _nodeId: string,
    config: Record<string, any>,
    context: ContextService,
  ): Promise<NodeExecutionResult> {
    const resolved = context.resolveConfig(config);
    // If config.output references a variable, use that as the workflow output
    const output = resolved.output !== undefined
      ? { result: resolved.output }
      : { result: null };
    return { outputs: output };
  }
}
```

- [ ] **步骤 2：编写测试**

```typescript
// apps/api/src/workflow/engine/executor/start-node.executor.spec.ts
import { StartNodeExecutor } from './start-node.executor';
import { ContextService } from '../context.service';

describe('StartNodeExecutor', () => {
  let executor: StartNodeExecutor;

  beforeEach(() => {
    executor = new StartNodeExecutor();
  });

  it('should return inputs as outputs', async () => {
    const ctx = new ContextService({ query: 'hello', userId: '123' });
    const result = await executor.execute('start', {}, ctx);
    expect(result.outputs).toEqual({ query: 'hello', userId: '123' });
  });

  it('should return empty object when no inputs', async () => {
    const ctx = new ContextService({});
    const result = await executor.execute('start', {}, ctx);
    expect(result.outputs).toEqual({});
  });
});
```

```typescript
// apps/api/src/workflow/engine/executor/end-node.executor.spec.ts
import { EndNodeExecutor } from './end-node.executor';
import { ContextService } from '../context.service';

describe('EndNodeExecutor', () => {
  let executor: EndNodeExecutor;

  beforeEach(() => {
    executor = new EndNodeExecutor();
  });

  it('should resolve output from context', async () => {
    const ctx = new ContextService({});
    ctx.setNodeOutput('llm_1', { content: 'hello world' });
    const result = await executor.execute('end', { output: '{{nodes.llm_1.output.content}}' }, ctx);
    expect(result.outputs).toEqual({ result: 'hello world' });
  });

  it('should pass through literal output', async () => {
    const ctx = new ContextService({});
    const result = await executor.execute('end', { output: 'static value' }, ctx);
    expect(result.outputs).toEqual({ result: 'static value' });
  });
});
```

- [ ] **步骤 3：运行测试**

```bash
cd apps/api && pnpm run test -- start-node.executor.spec.ts end-node.executor.spec.ts
# 预期：PASS
```

- [ ] **步骤 4：Commit**

```bash
git add apps/api/src/workflow/engine/executor/
git commit -m "feat: add NodeExecutor interface + start/end executors"
```

---

### 任务 5：LLM + Condition + KnowledgeRetrieval + QuestionClassifier 执行器

**文件：**
- 创建：`apps/api/src/workflow/engine/executor/llm-node.executor.ts`
- 创建：`apps/api/src/workflow/engine/executor/condition-node.executor.ts`
- 创建：`apps/api/src/workflow/engine/executor/knowledge-retrieval-node.executor.ts`
- 创建：`apps/api/src/workflow/engine/executor/question-classifier-node.executor.ts`
- 测试：对应 `.spec.ts` 文件

#### LLM 执行器

```typescript
// apps/api/src/workflow/engine/executor/llm-node.executor.ts
import { Injectable, Logger } from '@nestjs/common';
import { ProvidersService } from '../../../providers/providers.service';
import { NodeExecutor, NodeExecutionResult } from './node-executor.interface';
import { ContextService } from '../context.service';

@Injectable()
export class LLMNodeExecutor implements NodeExecutor {
  readonly type = 'llm';
  private readonly logger = new Logger(LLMNodeExecutor.name);

  constructor(private readonly providersService: ProvidersService) {}

  async execute(
    _nodeId: string,
    config: Record<string, any>,
    context: ContextService,
  ): Promise<NodeExecutionResult> {
    const resolved = context.resolveConfig(config);
    const { providerId, model, prompt, temperature = 0.7, maxTokens = 4096 } = resolved;

    const client = await this.providersService.getProviderClient(providerId);

    // Use non-streaming for workflow (collect full response)
    const response = await client.chat({
      model,
      messages: [{ role: 'system' as const, content: prompt }],
      temperature: Number(temperature),
      maxTokens: Number(maxTokens),
    });

    return {
      outputs: {
        content: response.content,
        tokens: response.usage
          ? { prompt: response.usage.promptTokens, completion: response.usage.completionTokens, total: response.usage.totalTokens }
          : { prompt: 0, completion: 0, total: 0 },
      },
    };
  }
}
```

#### Condition 执行器

```typescript
// apps/api/src/workflow/engine/executor/condition-node.executor.ts
import { Injectable } from '@nestjs/common';
import { NodeExecutor, NodeExecutionResult } from './node-executor.interface';
import { ContextService } from '../context.service';

@Injectable()
export class ConditionNodeExecutor implements NodeExecutor {
  readonly type = 'condition';

  async execute(
    _nodeId: string,
    config: Record<string, any>,
    context: ContextService,
  ): Promise<NodeExecutionResult> {
    const resolved = context.resolveConfig(config);
    const expression = resolved.expression || 'true';

    try {
      const result = !!(new Function('return ' + expression)());
      return { outputs: { result } };
    } catch {
      return { outputs: { result: false } };
    }
  }
}
```

#### KnowledgeRetrieval 执行器

```typescript
// apps/api/src/workflow/engine/executor/knowledge-retrieval-node.executor.ts
import { Injectable } from '@nestjs/common';
import { RetrievalService } from '../../../knowledge/retrieval.service';
import { NodeExecutor, NodeExecutionResult } from './node-executor.interface';
import { ContextService } from '../context.service';

@Injectable()
export class KnowledgeRetrievalNodeExecutor implements NodeExecutor {
  readonly type = 'knowledge_retrieval';

  constructor(private readonly retrievalService: RetrievalService) {}

  async execute(
    _nodeId: string,
    config: Record<string, any>,
    context: ContextService,
  ): Promise<NodeExecutionResult> {
    const resolved = context.resolveConfig(config);
    const { knowledgeBaseId, query, topK = 4 } = resolved;

    const results = await this.retrievalService.searchWithScore(knowledgeBaseId, query, topK);
    return {
      outputs: {
        segments: results.map(r => ({
          content: r.content,
          metadata: r.metadata,
          score: r.score,
        })),
        // 也保存纯文本拼接方便下级 LLM 引用
        combined: results.map((r, i) => `[${i + 1}] ${r.content}`).join('\n\n'),
      },
    };
  }
}
```

#### QuestionClassifier 执行器

```typescript
// apps/api/src/workflow/engine/executor/question-classifier-node.executor.ts
import { Injectable } from '@nestjs/common';
import { ProvidersService } from '../../../providers/providers.service';
import { NodeExecutor, NodeExecutionResult } from './node-executor.interface';
import { ContextService } from '../context.service';

@Injectable()
export class QuestionClassifierNodeExecutor implements NodeExecutor {
  readonly type = 'question_classifier';

  constructor(private readonly providersService: ProvidersService) {}

  async execute(
    _nodeId: string,
    config: Record<string, any>,
    context: ContextService,
  ): Promise<NodeExecutionResult> {
    const resolved = context.resolveConfig(config);
    const { providerId, model, instruction, categories, input } = resolved;

    const categoryList = (categories as Array<{ id: string; name: string; description?: string }>)
      .map(c => `- ${c.id}: ${c.name}${c.description ? ` — ${c.description}` : ''}`)
      .join('\n');

    const prompt = `${instruction}\n\n类别：\n${categoryList}\n\n用户输入：${input}\n\n请只返回类别 ID，不要有其他内容。`;

    const client = await this.providersService.getProviderClient(providerId);
    const response = await client.chat({
      model,
      messages: [{ role: 'system' as const, content: prompt }],
      temperature: 0.1,
    });

    const category = response.content.trim().toLowerCase();
    return { outputs: { category } };
  }
}
```

- [ ] **步骤 1：创建 4 个执行器文件**
- [ ] **步骤 2：编写 LLM 执行器测试（mock ProvidersService）**

```typescript
// apps/api/src/workflow/engine/executor/llm-node.executor.spec.ts
import { Test } from '@nestjs/testing';
import { LLMNodeExecutor } from './llm-node.executor';
import { ContextService } from '../context.service';
import { ProvidersService } from '../../../providers/providers.service';

describe('LLMNodeExecutor', () => {
  let executor: LLMNodeExecutor;

  const mockProvidersService = {
    getProviderClient: jest.fn().mockResolvedValue({
      chat: jest.fn().mockResolvedValue({
        content: 'AI response text',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      }),
      chatStream: jest.fn(),
    }),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LLMNodeExecutor,
        { provide: ProvidersService, useValue: mockProvidersService },
      ],
    }).compile();
    executor = module.get(LLMNodeExecutor);
  });

  it('should call LLM and return content + tokens', async () => {
    const ctx = new ContextService({ query: 'hello' });
    const result = await executor.execute('llm_1', {
      providerId: 'prov-1',
      model: 'gpt-4o',
      prompt: 'Answer: {{inputs.query}}',
    }, ctx);
    expect(result.outputs.content).toBe('AI response text');
    expect(result.outputs.tokens).toEqual({ prompt: 10, completion: 20, total: 30 });
  });
});
```

- [ ] **步骤 3：编写 Condition 执行器测试（独立，无外部依赖）**

```typescript
// apps/api/src/workflow/engine/executor/condition-node.executor.spec.ts
import { ConditionNodeExecutor } from './condition-node.executor';
import { ContextService } from '../context.service';

describe('ConditionNodeExecutor', () => {
  let executor: ConditionNodeExecutor;

  beforeEach(() => {
    executor = new ConditionNodeExecutor();
  });

  it('should evaluate true expression', async () => {
    const ctx = new ContextService({});
    ctx.setNodeOutput('llm_1', { tokens: { total: 150 } });
    const result = await executor.execute('cond_1', {
      expression: '{{nodes.llm_1.tokens.total}} > 100',
    }, ctx);
    expect(result.outputs.result).toBe(true);
  });

  it('should evaluate false expression', async () => {
    const ctx = new ContextService({});
    const result = await executor.execute('cond_1', {
      expression: '1 > 2',
    }, ctx);
    expect(result.outputs.result).toBe(false);
  });
});
```

- [ ] **步骤 4：运行所有 3 个执行器测试**

```bash
cd apps/api && pnpm run test -- llm-node.executor.spec.ts condition-node.executor.spec.ts
# 预期：PASS
```

- [ ] **步骤 5：Commit**

```bash
git add apps/api/src/workflow/engine/executor/
git commit -m "feat: add llm, condition, knowledge-retrieval, question-classifier executors"
```

---

### 任务 6：Code + HttpRequest 执行器

**文件：**
- 创建：`apps/api/src/workflow/engine/executor/code-node.executor.ts`
- 创建：`apps/api/src/workflow/engine/executor/http-request-node.executor.ts`
- 测试：对应 `.spec.ts` 文件

```typescript
// apps/api/src/workflow/engine/executor/code-node.executor.ts
import { Injectable } from '@nestjs/common';
import { NodeExecutor, NodeExecutionResult } from './node-executor.interface';
import { ContextService } from '../context.service';

@Injectable()
export class CodeNodeExecutor implements NodeExecutor {
  readonly type = 'code';
  private readonly TIMEOUT_MS = 30_000;

  async execute(
    _nodeId: string,
    config: Record<string, any>,
    context: ContextService,
  ): Promise<NodeExecutionResult> {
    const resolved = context.resolveConfig(config);
    const { code, inputs = {} } = resolved;

    const sandbox = {
      inputs,
      console: {
        log: (...args: any[]) => logs.push(args.map(String).join(' ')),
      },
      JSON,
      Math,
      Date,
      Array,
      Object,
      String,
      Number,
      Boolean,
      RegExp,
      Map,
      Set,
    };
    const logs: string[] = [];

    const fn = new Function(...Object.keys(sandbox), code);
    const result = await Promise.race([
      Promise.resolve(fn(...Object.values(sandbox))),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Code execution timed out')), this.TIMEOUT_MS)
      ),
    ]);

    return {
      outputs: { result, logs },
    };
  }
}
```

```typescript
// apps/api/src/workflow/engine/executor/http-request-node.executor.ts
import { Injectable } from '@nestjs/common';
import { NodeExecutor, NodeExecutionResult } from './node-executor.interface';
import { ContextService } from '../context.service';

@Injectable()
export class HttpRequestNodeExecutor implements NodeExecutor {
  readonly type = 'http_request';

  async execute(
    _nodeId: string,
    config: Record<string, any>,
    context: ContextService,
  ): Promise<NodeExecutionResult> {
    const resolved = context.resolveConfig(config);
    const { url, method = 'GET', headers = {}, body } = resolved;

    const fetchOptions: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
    };

    if (body && method !== 'GET') {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    const responseBody = await response.text();

    let parsedBody: any;
    try {
      parsedBody = JSON.parse(responseBody);
    } catch {
      parsedBody = responseBody;
    }

    return {
      outputs: {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: parsedBody,
      },
    };
  }
}
```

- [ ] **步骤 1：创建 2 个执行器文件**

- [ ] **步骤 2：编写测试**

```typescript
// apps/api/src/workflow/engine/executor/code-node.executor.spec.ts
import { CodeNodeExecutor } from './code-node.executor';
import { ContextService } from '../context.service';

describe('CodeNodeExecutor', () => {
  let executor: CodeNodeExecutor;

  beforeEach(() => {
    executor = new CodeNodeExecutor();
  });

  it('should execute JS code and return result', async () => {
    const ctx = new ContextService({ x: 10, y: 20 });
    const result = await executor.execute('code_1', {
      code: 'return inputs.x + inputs.y;',
      inputs: { x: '{{inputs.x}}', y: '{{inputs.y}}' },
    }, ctx);
    expect(result.outputs.result).toBe(30);
  });

  it('should capture console logs', async () => {
    const ctx = new ContextService({});
    const result = await executor.execute('code_1', {
      code: 'console.log("hello world"); return 42;',
      inputs: {},
    }, ctx);
    expect(result.outputs.result).toBe(42);
    expect(result.outputs.logs).toEqual(['hello world']);
  });
});
```

```typescript
// apps/api/src/workflow/engine/executor/http-request-node.executor.spec.ts
import { HttpRequestNodeExecutor } from './http-request-node.executor';
import { ContextService } from '../context.service';

describe('HttpRequestNodeExecutor', () => {
  let executor: HttpRequestNodeExecutor;

  beforeEach(() => {
    executor = new HttpRequestNodeExecutor();
  });

  it('should make GET request and return response', async () => {
    const ctx = new ContextService({});
    // Use jsonplaceholder as a test endpoint
    const result = await executor.execute('http_1', {
      url: 'https://jsonplaceholder.typicode.com/todos/1',
      method: 'GET',
    }, ctx);
    expect(result.outputs.status).toBe(200);
    expect(result.outputs.data).toBeDefined();
    expect(result.outputs.data.id).toBe(1);
  });
});
```

- [ ] **步骤 3：运行测试**

```bash
cd apps/api && pnpm run test -- code-node.executor.spec.ts http-request-node.executor.spec.ts
# 预期：PASS
```

- [ ] **步骤 4：Commit**

```bash
git add apps/api/src/workflow/engine/executor/
git commit -m "feat: add code and http_request node executors"
```

---

### 任务 7：图合法性验证

**文件：**
- 创建：`apps/api/src/workflow/engine/graph-validator.ts`
- 创建：`apps/api/src/workflow/engine/graph-validator.spec.ts`

- [ ] **步骤 1：编写实现**

```typescript
// apps/api/src/workflow/engine/graph-validator.ts
import { BadRequestException } from '@nestjs/common';
import { WorkflowGraph, WorkflowNode, WorkflowEdge } from '../entities/workflow.entity';
import { NODE_TYPES, NodeType } from '../types';

export interface ValidationError {
  field: string;
  message: string;
}

export function validateGraph(graph: WorkflowGraph): void {
  const errors: ValidationError[] = [];
  const { nodes, edges } = graph;

  // 1. Non-empty
  if (!nodes || nodes.length === 0) {
    errors.push({ field: 'nodes', message: 'Nodes array must not be empty' });
    throw new BadRequestException(errors);
  }

  // 2. Exactly one start
  const starts = nodes.filter(n => n.type === 'start');
  if (starts.length !== 1) {
    errors.push({ field: 'nodes', message: `Must have exactly one start node, found ${starts.length}` });
  }

  // 3. Exactly one end
  const ends = nodes.filter(n => n.type === 'end');
  if (ends.length !== 1) {
    errors.push({ field: 'nodes', message: `Must have exactly one end node, found ${ends.length}` });
  }

  // 4. Unique node IDs
  const ids = nodes.map(n => n.id);
  if (new Set(ids).size !== ids.length) {
    errors.push({ field: 'nodes', message: 'Node IDs must be unique' });
  }

  // 5. Valid node types
  for (const node of nodes) {
    if (!NODE_TYPES.includes(node.type as NodeType)) {
      errors.push({ field: `nodes.${node.id}.type`, message: `Invalid node type: ${node.type}` });
    }
  }

  // 6. Edge references valid nodes
  const idSet = new Set(ids);
  for (const edge of edges) {
    if (!idSet.has(edge.source)) {
      errors.push({ field: `edges.${edge.id}.source`, message: `Source node ${edge.source} not found` });
    }
    if (!idSet.has(edge.target)) {
      errors.push({ field: `edges.${edge.id}.target`, message: `Target node ${edge.target} not found` });
    }
  }

  // 7. Condition edges must have sourceHandle
  for (const node of nodes) {
    if (node.type === 'condition') {
      const outEdges = edges.filter(e => e.source === node.id);
      for (const edge of outEdges) {
        if (!edge.sourceHandle) {
          errors.push({ field: `edges.${edge.id}.sourceHandle`, message: `Condition node edges must have sourceHandle` });
        }
      }
    }
  }

  // 8. Cycle detection (topological sort)
  try {
    topologicalSort(nodes, edges);
  } catch {
    errors.push({ field: 'graph', message: 'Workflow contains a cycle' });
  }

  // 9. Start reachable to end
  if (!isReachable('start', 'end', nodes, edges, idSet)) {
    errors.push({ field: 'graph', message: 'Start node cannot reach end node' });
  }

  if (errors.length > 0) {
    throw new BadRequestException(errors.map(e => e.message).join('; '));
  }
}

export function topologicalSort(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[][] {
  const inDegree: Record<string, number> = {};
  const adjList: Record<string, string[]> = {};

  for (const n of nodes) {
    inDegree[n.id] = 0;
    adjList[n.id] = [];
  }
  for (const e of edges) {
    adjList[e.source]?.push(e.target);
    if (inDegree[e.target] !== undefined) inDegree[e.target]++;
  }

  const layers: string[][] = [];
  let queue = nodes.filter(n => inDegree[n.id] === 0).map(n => n.id);

  while (queue.length > 0) {
    layers.push([...queue]);
    const nextQueue: string[] = [];
    for (const id of queue) {
      for (const neighbor of adjList[id] || []) {
        inDegree[neighbor]--;
        if (inDegree[neighbor] === 0) nextQueue.push(neighbor);
      }
    }
    queue = nextQueue;
  }

  const totalProcessed = layers.flat().length;
  if (totalProcessed !== nodes.length) {
    throw new Error('Graph contains a cycle');
  }

  return layers;
}

function isReachable(
  startType: string,
  endType: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  idSet: Set<string>,
): boolean {
  const start = nodes.find(n => n.type === startType);
  const end = nodes.find(n => n.type === endType);
  if (!start || !end) return false;

  const visited = new Set<string>();
  const queue = [start.id];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === end.id) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const edge of edges) {
      if (edge.source === current && idSet.has(edge.target)) {
        queue.push(edge.target);
      }
    }
  }
  return false;
}
```

- [ ] **步骤 2：编写测试**

```typescript
// apps/api/src/workflow/engine/graph-validator.spec.ts
import { BadRequestException } from '@nestjs/common';
import { validateGraph, topologicalSort } from './graph-validator';
import { WorkflowNode, WorkflowEdge } from '../entities/workflow.entity';

describe('graph-validator', () => {
  const makeNode = (id: string, type: string): WorkflowNode => ({
    id, type, label: id, position: { x: 0, y: 0 }, config: {},
  });
  const makeEdge = (id: string, source: string, target: string, sourceHandle?: string): WorkflowEdge => ({
    id, source, target, sourceHandle,
  });

  it('should accept a valid linear graph', () => {
    expect(() => validateGraph({
      nodes: [makeNode('start', 'start'), makeNode('llm_1', 'llm'), makeNode('end', 'end')],
      edges: [makeEdge('e1', 'start', 'llm_1'), makeEdge('e2', 'llm_1', 'end')],
    })).not.toThrow();
  });

  it('should reject empty nodes', () => {
    expect(() => validateGraph({ nodes: [], edges: [] })).toThrow(BadRequestException);
  });

  it('should reject multiple start nodes', () => {
    expect(() => validateGraph({
      nodes: [makeNode('s1', 'start'), makeNode('s2', 'start'), makeNode('end', 'end')],
      edges: [makeEdge('e1', 's1', 'end')],
    })).toThrow(BadRequestException);
  });

  it('should reject cycles', () => {
    expect(() => validateGraph({
      nodes: [makeNode('start', 'start'), makeNode('a', 'llm'), makeNode('b', 'llm'), makeNode('end', 'end')],
      edges: [makeEdge('e1', 'start', 'a'), makeEdge('e2', 'a', 'b'), makeEdge('e3', 'b', 'a'), makeEdge('e4', 'a', 'end')],
    })).toThrow('cycle');
  });

  it('should reject condition edge without sourceHandle', () => {
    expect(() => validateGraph({
      nodes: [makeNode('start', 'start'), makeNode('cond', 'condition'), makeNode('end', 'end')],
      edges: [makeEdge('e1', 'start', 'cond'), makeEdge('e2', 'cond', 'end')],
    })).toThrow('sourceHandle');
  });

  it('should accept condition with sourceHandle', () => {
    expect(() => validateGraph({
      nodes: [makeNode('start', 'start'), makeNode('cond', 'condition'), makeNode('end', 'end')],
      edges: [makeEdge('e1', 'start', 'cond'), makeEdge('e2', 'cond', 'end', 'true')],
    })).not.toThrow();
  });

  it('should topological sort into correct layers', () => {
    const nodes = [makeNode('start', 'start'), makeNode('llm', 'llm'), makeNode('kb', 'knowledge_retrieval'), makeNode('end', 'end')];
    const edges = [makeEdge('e1', 'start', 'llm'), makeEdge('e2', 'start', 'kb'), makeEdge('e3', 'llm', 'end'), makeEdge('e4', 'kb', 'end')];
    const layers = topologicalSort(nodes, edges);
    expect(layers[0]).toContain('start');
    expect(layers[1].sort()).toEqual(['kb', 'llm']);
    expect(layers[2]).toContain('end');
  });
});
```

- [ ] **步骤 3：运行测试**

```bash
cd apps/api && pnpm run test -- graph-validator.spec.ts
# 预期：PASS (6 tests)
```

- [ ] **步骤 4：Commit**

```bash
git add apps/api/src/workflow/engine/graph-validator.ts apps/api/src/workflow/engine/graph-validator.spec.ts
git commit -m "feat: add graph validator with cycle detection and topological sort"
```

---

### 任务 8：DagEngineService — DAG 编排核心

**文件：**
- 创建：`apps/api/src/workflow/engine/dag-engine.service.ts`
- 创建：`apps/api/src/workflow/engine/dag-engine.service.spec.ts`

- [ ] **步骤 1：编写 DagEngineService**

```typescript
// apps/api/src/workflow/engine/dag-engine.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workflow, WorkflowNode, WorkflowEdge } from '../entities/workflow.entity';
import { WorkflowRun } from '../entities/workflow-run.entity';
import { WorkflowNodeExecution } from '../entities/workflow-node-execution.entity';
import { validateGraph, topologicalSort } from './graph-validator';
import { ContextService } from './context.service';
import { NodeExecutor } from './executor/node-executor.interface';
import { StartNodeExecutor } from './executor/start-node.executor';
import { EndNodeExecutor } from './executor/end-node.executor';
import { LLMNodeExecutor } from './executor/llm-node.executor';
import { CodeNodeExecutor } from './executor/code-node.executor';
import { ConditionNodeExecutor } from './executor/condition-node.executor';
import { HttpRequestNodeExecutor } from './executor/http-request-node.executor';
import { KnowledgeRetrievalNodeExecutor } from './executor/knowledge-retrieval-node.executor';
import { QuestionClassifierNodeExecutor } from './executor/question-classifier-node.executor';

@Injectable()
export class DagEngineService {
  private readonly logger = new Logger(DagEngineService.name);
  private readonly executorMap: Map<string, NodeExecutor>;

  constructor(
    @InjectRepository(WorkflowRun)
    private readonly runRepo: Repository<WorkflowRun>,
    @InjectRepository(WorkflowNodeExecution)
    private readonly nodeExecRepo: Repository<WorkflowNodeExecution>,
    startNodeExecutor: StartNodeExecutor,
    endNodeExecutor: EndNodeExecutor,
    llmNodeExecutor: LLMNodeExecutor,
    codeNodeExecutor: CodeNodeExecutor,
    conditionNodeExecutor: ConditionNodeExecutor,
    httpRequestNodeExecutor: HttpRequestNodeExecutor,
    knowledgeRetrievalNodeExecutor: KnowledgeRetrievalNodeExecutor,
    questionClassifierNodeExecutor: QuestionClassifierNodeExecutor,
  ) {
    this.executorMap = new Map<string, NodeExecutor>();
    for (const exec of [
      startNodeExecutor, endNodeExecutor, llmNodeExecutor, codeNodeExecutor,
      conditionNodeExecutor, httpRequestNodeExecutor, knowledgeRetrievalNodeExecutor,
      questionClassifierNodeExecutor,
    ]) {
      this.executorMap.set(exec.type, exec);
    }
  }

  async executeWorkflow(
    workflow: Workflow,
    inputs: Record<string, any>,
    triggeredBy: 'api' | 'manual',
  ): Promise<WorkflowRun> {
    // Validate before execution
    validateGraph(workflow.graph);

    const run = await this.runRepo.save(
      this.runRepo.create({
        workflowId: workflow.id,
        status: 'running',
        inputs,
        triggeredBy,
        startedAt: new Date(),
      }),
    );

    // Execute in background — don't await
    this.runExecution(workflow, run, inputs).catch(err => {
      this.logger.error(`Workflow ${workflow.id} execution failed: ${err.message}`);
    });

    return run;
  }

  async executeWorkflowDebug(
    workflow: Workflow,
    inputs: Record<string, any>,
  ): Promise<{ run: WorkflowRun; nodeExecutions: WorkflowNodeExecution[] }> {
    validateGraph(workflow.graph);

    const run = await this.runRepo.save(
      this.runRepo.create({
        workflowId: workflow.id,
        status: 'running',
        inputs,
        triggeredBy: 'manual',
        startedAt: new Date(),
      }),
    );

    const nodeExecutions = await this.runExecution(workflow, run, inputs);

    return { run, nodeExecutions };
  }

  private async runExecution(
    workflow: Workflow,
    run: WorkflowRun,
    inputs: Record<string, any>,
  ): Promise<WorkflowNodeExecution[]> {
    const { nodes, edges } = workflow.graph;
    const context = new ContextService(inputs);
    const nodeExecutions: WorkflowNodeExecution[] = [];

    try {
      const layers = topologicalSort(nodes, edges);
      const nodeMap = new Map(nodes.map(n => [n.id, n]));

      for (const layer of layers) {
        const promises = layer.map(nodeId =>
          this.executeNode(nodeId, nodeMap.get(nodeId)!, edges, context, run.id, nodeExecutions)
        );
        await Promise.all(promises);
      }

      // Get end node output as workflow output
      const endNode = nodes.find(n => n.type === 'end');
      if (endNode) {
        const endOutput = context.resolve('{{' + `nodes.${endNode.id}.output` + '}}');
        run.outputs = typeof endOutput === 'object' ? endOutput : { result: endOutput };
      }
      run.status = 'succeeded';
    } catch (err) {
      this.logger.error(`Workflow execution error: ${(err as Error).message}`);
      run.status = 'failed';
      run.error = (err as Error).message;

      // Mark pending nodes as skipped
      for (const ne of nodeExecutions) {
        if (ne.status === 'pending' || ne.status === 'running') {
          ne.status = 'skipped';
          ne.completedAt = new Date();
        }
      }
    }

    run.completedAt = new Date();
    await this.runRepo.save(run);
    await Promise.all(nodeExecutions.map(ne => this.nodeExecRepo.save(ne)));

    return nodeExecutions;
  }

  private async executeNode(
    nodeId: string,
    node: WorkflowNode,
    edges: WorkflowEdge[],
    context: ContextService,
    runId: string,
    nodeExecutions: WorkflowNodeExecution[],
  ): Promise<void> {
    const startTime = Date.now();

    const execution = this.nodeExecRepo.create({
      runId,
      nodeId: node.id,
      nodeType: node.type,
      status: 'running',
      startedAt: new Date(),
    });
    nodeExecutions.push(execution);

    try {
      const executor = this.executorMap.get(node.type);
      if (!executor) {
        throw new Error(`No executor found for node type: ${node.type}`);
      }

      const resolvedConfig = context.resolveConfig(node.config);
      execution.inputs = resolvedConfig;

      const result = await executor.execute(node.id, resolvedConfig, context);
      context.setNodeOutput(node.id, result.outputs);

      execution.outputs = result.outputs;
      execution.status = 'succeeded';

      // Handle conditional routing
      if (node.type === 'condition') {
        const outEdges = edges.filter(e => e.source === node.id);
        const matching = outEdges.filter(e => e.sourceHandle === String(result.outputs.result));
        if (matching.length === 0) {
          this.logger.warn(`Condition node ${node.id} has no matching edge for result=${result.outputs.result}`);
        }
      } else if (node.type === 'question_classifier') {
        const outEdges = edges.filter(e => e.source === node.id);
        const matching = outEdges.filter(e => e.sourceHandle === result.outputs.category);
        if (matching.length === 0) {
          // No matching edge — mark downstream nodes as skipped
          this.markDownstreamSkipped(node.id, edges, runId, nodeExecutions);
        }
      }
    } catch (err) {
      execution.status = 'failed';
      execution.error = (err as Error).message;
      // Re-throw so the layer execution knows this failed
      throw err;
    } finally {
      execution.completedAt = new Date();
      execution.latency = Date.now() - startTime;
    }
  }

  private markDownstreamSkipped(
    nodeId: string,
    edges: WorkflowEdge[],
    _runId: string,
    nodeExecutions: WorkflowNodeExecution[],
  ): void {
    const queue = edges.filter(e => e.source === nodeId).map(e => e.target);
    while (queue.length > 0) {
      const targetId = queue.shift()!;
      const existing = nodeExecutions.find(e => e.nodeId === targetId);
      if (existing && existing.status === 'pending') {
        existing.status = 'skipped';
      }
      queue.push(...edges.filter(e => e.source === targetId).map(e => e.target));
    }
  }
}
```

- [ ] **步骤 2：编写测试**

```typescript
// apps/api/src/workflow/engine/dag-engine.service.spec.ts
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { fromPartial } from '@total-typescript/shoehorn';
import { DagEngineService } from './dag-engine.service';
import { WorkflowRun } from '../entities/workflow-run.entity';
import { WorkflowNodeExecution } from '../entities/workflow-node-execution.entity';
import { Workflow } from '../entities/workflow.entity';
import { StartNodeExecutor } from './executor/start-node.executor';
import { EndNodeExecutor } from './executor/end-node.executor';
import { LLMNodeExecutor } from './executor/llm-node.executor';
import { CodeNodeExecutor } from './executor/code-node.executor';
import { ConditionNodeExecutor } from './executor/condition-node.executor';
import { HttpRequestNodeExecutor } from './executor/http-request-node.executor';
import { KnowledgeRetrievalNodeExecutor } from './executor/knowledge-retrieval-node.executor';
import { QuestionClassifierNodeExecutor } from './executor/question-classifier-node.executor';
import { ProvidersService } from '../../providers/providers.service';
import { RetrievalService } from '../../knowledge/retrieval.service';

describe('DagEngineService', () => {
  // Mock run repo
  const mockRunRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn().mockImplementation((r: any) => Promise.resolve({ ...r, id: 'run-1' })),
    create: jest.fn().mockImplementation((d: any) => d),
  };
  const mockNodeExecRepo = {
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn().mockImplementation((d: any) => d),
  };
  const mockProvidersService = {
    getProviderClient: jest.fn().mockResolvedValue({
      chat: jest.fn().mockResolvedValue({ content: 'AI reply', usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 } }),
      chatStream: jest.fn(),
    }),
  };
  const mockRetrievalService = {
    searchWithScore: jest.fn().mockResolvedValue([]),
  };

  let engine: DagEngineService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DagEngineService,
        StartNodeExecutor,
        EndNodeExecutor,
        LLMNodeExecutor,
        CodeNodeExecutor,
        ConditionNodeExecutor,
        HttpRequestNodeExecutor,
        { provide: KnowledgeRetrievalNodeExecutor, useFactory: () => new KnowledgeRetrievalNodeExecutor(mockRetrievalService as any) },
        { provide: QuestionClassifierNodeExecutor, useFactory: () => new QuestionClassifierNodeExecutor(mockProvidersService as any) },
        { provide: ProvidersService, useValue: mockProvidersService },
        { provide: RetrievalService, useValue: mockRetrievalService },
        { provide: getRepositoryToken(WorkflowRun), useValue: mockRunRepo },
        { provide: getRepositoryToken(WorkflowNodeExecution), useValue: mockNodeExecRepo },
      ],
    }).compile();

    engine = module.get(DagEngineService);
  });

  it('should execute a simple linear workflow', async () => {
    const wf = fromPartial<Workflow>({
      id: 'wf-1',
      graph: {
        nodes: [
          { id: 'start', type: 'start', label: 'Start', position: { x: 0, y: 0 }, config: {} },
          { id: 'llm_1', type: 'llm', label: 'LLM', position: { x: 100, y: 0 }, config: { providerId: 'p1', model: 'gpt-4o', prompt: 'hi' } },
          { id: 'end', type: 'end', label: 'End', position: { x: 200, y: 0 }, config: { output: '{{nodes.llm_1.output.content}}' } },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'llm_1' },
          { id: 'e2', source: 'llm_1', target: 'end' },
        ],
      },
    });

    const { run, nodeExecutions } = await engine.executeWorkflowDebug(wf, { query: 'test' });
    expect(run.status).toBe('succeeded');
    expect(nodeExecutions.length).toBe(3);
    expect(nodeExecutions.every(n => n.status === 'succeeded')).toBe(true);
    expect(run.outputs).toBeDefined();
  });
});
```

- [ ] **步骤 3：运行测试**

```bash
cd apps/api && pnpm run test -- dag-engine.service.spec.ts
# 预期：PASS
```

- [ ] **步骤 4：Commit**

```bash
git add apps/api/src/workflow/engine/dag-engine.service.ts apps/api/src/workflow/engine/dag-engine.service.spec.ts
git commit -m "feat: implement DagEngineService with layered parallel execution"
```

---

### 任务 9：Workflow CRUD Controller + Service

**文件：**
- 创建：`apps/api/src/workflow/workflow.service.ts`
- 创建：`apps/api/src/workflow/workflow.service.spec.ts`
- 创建：`apps/api/src/workflow/workflow.controller.ts`
- 创建：`apps/api/src/workflow/workflow.controller.spec.ts`

- [ ] **步骤 1：编写 WorkflowService**

```typescript
// apps/api/src/workflow/workflow.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workflow } from './entities/workflow.entity';
import { CreateWorkflowDto, UpdateWorkflowDto } from './dto';
import { validateGraph } from './engine/graph-validator';

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(Workflow)
    private readonly repo: Repository<Workflow>,
  ) {}

  async findAll(userId: string): Promise<Workflow[]> {
    return this.repo.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
      select: ['id', 'name', 'description', 'userId', 'createdAt', 'updatedAt'],
    });
  }

  async findOne(id: string): Promise<Workflow> {
    const wf = await this.repo.findOneBy({ id });
    if (!wf) throw new NotFoundException('Workflow not found');
    return wf;
  }

  async create(userId: string, dto: CreateWorkflowDto): Promise<Workflow> {
    validateGraph(dto.graph);
    const wf = this.repo.create({ ...dto, userId });
    return this.repo.save(wf);
  }

  async update(id: string, userId: string, dto: UpdateWorkflowDto): Promise<Workflow> {
    const wf = await this.findOne(id);
    if (wf.userId !== userId) throw new NotFoundException('Workflow not found');
    if (dto.graph) validateGraph(dto.graph);
    Object.assign(wf, dto);
    return this.repo.save(wf);
  }

  async delete(id: string, userId: string): Promise<void> {
    const wf = await this.findOne(id);
    if (wf.userId !== userId) throw new NotFoundException('Workflow not found');
    await this.repo.delete(id);
  }
}
```

- [ ] **步骤 2：编写 WorkflowController**

```typescript
// apps/api/src/workflow/workflow.controller.ts
import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe,
  Patch, Post, Req, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkflowService } from './workflow.service';
import { CreateWorkflowDto, UpdateWorkflowDto } from './dto';

@ApiTags('Workflows')
@Controller('workflows')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Get()
  @ApiOperation({ summary: '获取工作流列表' })
  async findAll(@Req() req: any) {
    return this.workflowService.findAll(req.user!.id);
  }

  @Post()
  @ApiOperation({ summary: '创建工作流' })
  async create(@Req() req: any, @Body() dto: CreateWorkflowDto) {
    return this.workflowService.create(req.user!.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取工作流详情' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.workflowService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新工作流' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
    @Body() dto: UpdateWorkflowDto,
  ) {
    return this.workflowService.update(id, req.user!.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除工作流' })
  async delete(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.workflowService.delete(id, req.user!.id);
  }
}
```

- [ ] **步骤 3：编写测试**

```typescript
// apps/api/src/workflow/workflow.service.spec.ts
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { fromPartial } from '@total-typescript/shoehorn';
import { NotFoundException } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { Workflow } from './entities/workflow.entity';

describe('WorkflowService', () => {
  const mockWorkflow = fromPartial<Workflow>({
    id: 'wf-1', name: 'Test', userId: 'user-1',
    graph: { nodes: [{ id: 'start', type: 'start', label: 'S', position: { x: 0, y: 0 }, config: {} },
      { id: 'end', type: 'end', label: 'E', position: { x: 100, y: 0 }, config: {} }],
      edges: [{ id: 'e1', source: 'start', target: 'end' }] },
  });

  const mockRepo = {
    find: jest.fn().mockResolvedValue([mockWorkflow]),
    findOneBy: jest.fn().mockResolvedValue(mockWorkflow),
    create: jest.fn().mockReturnValue(mockWorkflow),
    save: jest.fn().mockResolvedValue(mockWorkflow),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  let service: WorkflowService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        WorkflowService,
        { provide: getRepositoryToken(Workflow), useValue: mockRepo },
      ],
    }).compile();
    service = module.get(WorkflowService);
  });

  it('findAll should return workflows', async () => {
    const result = await service.findAll('user-1');
    expect(result).toEqual([mockWorkflow]);
    expect(mockRepo.find).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      order: { updatedAt: 'DESC' },
      select: ['id', 'name', 'description', 'userId', 'createdAt', 'updatedAt'],
    });
  });

  it('create should validate graph and save', async () => {
    const dto: any = { name: 'Test', graph: { nodes: [{ id: 'start', type: 'start', label: 'S', position: { x: 0, y: 0 }, config: {} },
      { id: 'end', type: 'end', label: 'E', position: { x: 100, y: 0 }, config: {} }],
      edges: [{ id: 'e1', source: 'start', target: 'end' }] } };
    const result = await service.create('user-1', dto);
    expect(result).toBeDefined();
  });

  it('findOne should throw on missing', async () => {
    mockRepo.findOneBy.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });
});
```

```typescript
// apps/api/src/workflow/workflow.controller.spec.ts
import { CanActivate } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';

describe('WorkflowController', () => {
  let controller: WorkflowController;
  const mockService = {
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({ id: 'wf-1' }),
    create: jest.fn().mockResolvedValue({ id: 'wf-1' }),
    update: jest.fn().mockResolvedValue({ id: 'wf-1' }),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const mockJwtAuthGuard: CanActivate = { canActivate: jest.fn(() => true) };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [WorkflowController],
      providers: [{ provide: WorkflowService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();
    controller = module.get(WorkflowController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll should return workflow list', async () => {
    const result = await controller.findAll({ user: { id: 'user-1' } });
    expect(result).toEqual([]);
  });
});
```

- [ ] **步骤 4：运行测试**

```bash
cd apps/api && pnpm run test -- workflow.service.spec.ts workflow.controller.spec.ts
# 预期：PASS
```

- [ ] **步骤 5：Commit**

```bash
git add apps/api/src/workflow/workflow.service.ts apps/api/src/workflow/workflow.service.spec.ts apps/api/src/workflow/workflow.controller.ts apps/api/src/workflow/workflow.controller.spec.ts
git commit -m "feat: add workflow CRUD controller and service"
```

---

### 任务 10：Run Controller + Service — 执行 API

**文件：**
- 创建：`apps/api/src/workflow/run.service.ts`
- 创建：`apps/api/src/workflow/run.service.spec.ts`
- 创建：`apps/api/src/workflow/run.controller.ts`
- 创建：`apps/api/src/workflow/run.controller.spec.ts`

- [ ] **步骤 1：编写 RunService**

```typescript
// apps/api/src/workflow/run.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowRun } from './entities/workflow-run.entity';
import { WorkflowNodeExecution } from './entities/workflow-node-execution.entity';
import { WorkflowService } from './workflow.service';
import { DagEngineService } from './engine/dag-engine.service';

@Injectable()
export class RunService {
  constructor(
    @InjectRepository(WorkflowRun)
    private readonly runRepo: Repository<WorkflowRun>,
    @InjectRepository(WorkflowNodeExecution)
    private readonly nodeExecRepo: Repository<WorkflowNodeExecution>,
    private readonly workflowService: WorkflowService,
    private readonly dagEngine: DagEngineService,
  ) {}

  async execute(workflowId: string, inputs: Record<string, any>): Promise<WorkflowRun> {
    const wf = await this.workflowService.findOne(workflowId);
    return this.dagEngine.executeWorkflow(wf, inputs, 'api');
  }

  async executeDebug(
    workflowId: string,
    inputs: Record<string, any>,
  ) {
    const wf = await this.workflowService.findOne(workflowId);
    const { run, nodeExecutions } = await this.dagEngine.executeWorkflowDebug(wf, inputs);
    return { run, nodeExecutions };
  }

  async findByWorkflow(workflowId: string): Promise<WorkflowRun[]> {
    return this.runRepo.find({
      where: { workflowId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(runId: string): Promise<WorkflowRun> {
    const run = await this.runRepo.findOneBy({ id: runId });
    if (!run) throw new NotFoundException('Run not found');
    return run;
  }

  async findNodeExecutions(runId: string): Promise<WorkflowNodeExecution[]> {
    return this.nodeExecRepo.find({
      where: { runId },
      order: { startedAt: 'ASC' },
    });
  }
}
```

- [ ] **步骤 2：编写 RunController**

```typescript
// apps/api/src/workflow/run.controller.ts
import {
  Body, Controller, Get, HttpCode, Param, ParseUUIDPipe,
  Post, Req, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RunService } from './run.service';
import { ExecuteWorkflowDto } from './dto';

@ApiTags('Workflows - Runs')
@Controller('workflows/:workflowId/runs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RunController {
  constructor(private readonly runService: RunService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: '执行工作流（异步）' })
  async execute(
    @Param('workflowId', ParseUUIDPipe) workflowId: string,
    @Body() dto: ExecuteWorkflowDto,
  ) {
    const run = await this.runService.execute(workflowId, dto.inputs);
    return { runId: run.id, status: run.status };
  }

  @Post('debug')
  @HttpCode(200)
  @ApiOperation({ summary: '调试执行工作流（同步返回全部中间结果）' })
  async executeDebug(
    @Param('workflowId', ParseUUIDPipe) workflowId: string,
    @Body() dto: ExecuteWorkflowDto,
  ) {
    const { run, nodeExecutions } = await this.runService.executeDebug(workflowId, dto.inputs);
    return {
      runId: run.id,
      status: run.status,
      outputs: run.outputs,
      nodeExecutions: nodeExecutions.map(ne => ({
        nodeId: ne.nodeId,
        nodeType: ne.nodeType,
        status: ne.status,
        inputs: ne.inputs,
        outputs: ne.outputs,
        latency: ne.latency,
        error: ne.error,
      })),
    };
  }

  @Get()
  @ApiOperation({ summary: '获取运行历史列表' })
  async findByWorkflow(@Param('workflowId', ParseUUIDPipe) workflowId: string) {
    return this.runService.findByWorkflow(workflowId);
  }

  @Get(':runId')
  @ApiOperation({ summary: '获取运行详情' })
  async findOne(@Param('runId', ParseUUIDPipe) runId: string) {
    return this.runService.findOne(runId);
  }

  @Get(':runId/nodes')
  @ApiOperation({ summary: '获取节点执行快照' })
  async findNodeExecutions(@Param('runId', ParseUUIDPipe) runId: string) {
    return this.runService.findNodeExecutions(runId);
  }
}
```

- [ ] **步骤 3：编写测试**

```typescript
// apps/api/src/workflow/run.service.spec.ts
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { fromPartial } from '@total-typescript/shoehorn';
import { RunService } from './run.service';
import { WorkflowRun } from './entities/workflow-run.entity';
import { WorkflowNodeExecution } from './entities/workflow-node-execution.entity';
import { WorkflowService } from './workflow.service';
import { DagEngineService } from './engine/dag-engine.service';

describe('RunService', () => {
  const mockRunRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOneBy: jest.fn().mockResolvedValue(fromPartial<WorkflowRun>({ id: 'run-1', status: 'succeeded' })),
  };
  const mockNodeExecRepo = {
    find: jest.fn().mockResolvedValue([]),
  };
  const mockWorkflowService = {
    findOne: jest.fn().mockResolvedValue({ id: 'wf-1', graph: { nodes: [], edges: [] } }),
  };
  const mockDagEngine = {
    executeWorkflow: jest.fn().mockResolvedValue(fromPartial<WorkflowRun>({ id: 'run-1', status: 'running' })),
    executeWorkflowDebug: jest.fn().mockResolvedValue({
      run: fromPartial<WorkflowRun>({ id: 'run-1', status: 'succeeded' }),
      nodeExecutions: [],
    }),
  };

  let service: RunService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RunService,
        { provide: getRepositoryToken(WorkflowRun), useValue: mockRunRepo },
        { provide: getRepositoryToken(WorkflowNodeExecution), useValue: mockNodeExecRepo },
        { provide: WorkflowService, useValue: mockWorkflowService },
        { provide: DagEngineService, useValue: mockDagEngine },
      ],
    }).compile();
    service = module.get(RunService);
  });

  it('should execute workflow', async () => {
    const result = await service.execute('wf-1', { query: 'test' });
    expect(result.status).toBe('running');
  });

  it('should execute debug workflow', async () => {
    const result = await service.executeDebug('wf-1', { query: 'test' });
    expect(result.run.status).toBe('succeeded');
  });
});
```

```typescript
// apps/api/src/workflow/run.controller.spec.ts
import { CanActivate } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RunController } from './run.controller';
import { RunService } from './run.service';

describe('RunController', () => {
  let controller: RunController;
  const mockService = {
    execute: jest.fn().mockResolvedValue({ id: 'run-1', status: 'running' }),
    executeDebug: jest.fn().mockResolvedValue({ run: { id: 'run-1', status: 'succeeded' }, nodeExecutions: [] }),
    findByWorkflow: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({ id: 'run-1' }),
    findNodeExecutions: jest.fn().mockResolvedValue([]),
  };
  const mockJwtAuthGuard: CanActivate = { canActivate: jest.fn(() => true) };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [RunController],
      providers: [{ provide: RunService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();
    controller = module.get(RunController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('execute should return runId and status', async () => {
    const result = await controller.execute('wf-1', { inputs: {} });
    expect(result.runId).toBe('run-1');
  });
});
```

- [ ] **步骤 4：运行测试**

```bash
cd apps/api && pnpm run test -- run.service.spec.ts run.controller.spec.ts
# 预期：PASS
```

- [ ] **步骤 5：Commit**

```bash
git add apps/api/src/workflow/run.service.ts apps/api/src/workflow/run.service.spec.ts apps/api/src/workflow/run.controller.ts apps/api/src/workflow/run.controller.spec.ts
git commit -m "feat: add run execution controller and service"
```

---

### 任务 11：WorkflowModule + AppModule 注册

**文件：**
- 创建：`apps/api/src/workflow/workflow.module.ts`
- 修改：`apps/api/src/app.module.ts`

- [ ] **步骤 1：编写 WorkflowModule**

```typescript
// apps/api/src/workflow/workflow.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthGuardModule } from '../auth/auth-guard.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { ProvidersModule } from '../providers/providers.module';
import { Workflow } from './entities/workflow.entity';
import { WorkflowRun } from './entities/workflow-run.entity';
import { WorkflowNodeExecution } from './entities/workflow-node-execution.entity';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { RunController } from './run.controller';
import { RunService } from './run.service';
import { DagEngineService } from './engine/dag-engine.service';
import { ContextService } from './engine/context.service';
import { StartNodeExecutor } from './engine/executor/start-node.executor';
import { EndNodeExecutor } from './engine/executor/end-node.executor';
import { LLMNodeExecutor } from './engine/executor/llm-node.executor';
import { CodeNodeExecutor } from './engine/executor/code-node.executor';
import { ConditionNodeExecutor } from './engine/executor/condition-node.executor';
import { HttpRequestNodeExecutor } from './engine/executor/http-request-node.executor';
import { KnowledgeRetrievalNodeExecutor } from './engine/executor/knowledge-retrieval-node.executor';
import { QuestionClassifierNodeExecutor } from './engine/executor/question-classifier-node.executor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Workflow, WorkflowRun, WorkflowNodeExecution]),
    AuthGuardModule,
    ProvidersModule,
    KnowledgeModule,
  ],
  controllers: [WorkflowController, RunController],
  providers: [
    WorkflowService,
    RunService,
    DagEngineService,
    ContextService,
    StartNodeExecutor,
    EndNodeExecutor,
    LLMNodeExecutor,
    CodeNodeExecutor,
    ConditionNodeExecutor,
    HttpRequestNodeExecutor,
    KnowledgeRetrievalNodeExecutor,
    QuestionClassifierNodeExecutor,
  ],
  exports: [WorkflowService],
})
export class WorkflowModule {}
```

- [ ] **步骤 2：在 AppModule 中注册**

```typescript
// apps/api/src/app.module.ts — import WorkflowModule
import { WorkflowModule } from './workflow/workflow.module';

@Module({
  imports: [
    // ... 现有模块
    WorkflowModule,
  ],
})
```

- [ ] **步骤 3：运行全部测试确认无回归**

```bash
cd apps/api && pnpm run test
# 预期：所有测试 PASS（包括之前的 188 个 + 新增的）
```

- [ ] **步骤 4：Commit**

```bash
git add apps/api/src/workflow/workflow.module.ts apps/api/src/app.module.ts
git commit -m "feat: register WorkflowModule in AppModule"
```

---

### 任务 12：前端依赖 + React Flow 画布基础

**文件：**
- 修改：`apps/web/package.json`
- 创建：`apps/web/src/app/(dashboard)/workflows/page.tsx`（列表页）
- 创建：`apps/web/src/app/(dashboard)/workflows/new/page.tsx`（新建页）
- 创建：`apps/web/src/app/(dashboard)/workflows/[id]/edit/page.tsx`（画布编辑页）
- 创建：`apps/web/src/app/(dashboard)/workflows/[id]/runs/page.tsx`（运行历史）
- 创建：`apps/web/src/app/(dashboard)/workflows/[id]/runs/[runId]/page.tsx`（运行详情）
- 创建：`apps/web/src/api/workflow.ts`（API 客户端）

- [ ] **步骤 1：安装 React Flow**

```bash
cd apps/web && pnpm add @xyflow/react
```

- [ ] **步骤 2：编写 API 客户端**

```typescript
// apps/web/src/api/workflow.ts
import { apiClient } from './client';

export interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  config: Record<string, any>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  graph: WorkflowGraph;
  createdAt: string;
  updatedAt: string;
}

export const workflowApi = {
  list: () => apiClient.get('workflows').json<Workflow[]>(),
  get: (id: string) => apiClient.get(`workflows/${id}`).json<Workflow>(),
  create: (data: { name: string; description?: string; graph: WorkflowGraph }) =>
    apiClient.post('workflows', { json: data }).json<Workflow>(),
  update: (id: string, data: Partial<{ name: string; description: string; graph: WorkflowGraph }>) =>
    apiClient.patch(`workflows/${id}`, { json: data }).json<Workflow>(),
  delete: (id: string) => apiClient.delete(`workflows/${id}`),
  execute: (id: string, inputs: Record<string, any>) =>
    apiClient.post(`workflows/${id}/runs`, { json: { inputs } }).json<{ runId: string; status: string }>(),
  executeDebug: (id: string, inputs: Record<string, any>) =>
    apiClient.post(`workflows/${id}/runs/debug`, { json: { inputs } }).json<any>(),
  getRuns: (id: string) => apiClient.get(`workflows/${id}/runs`).json<any[]>(),
  getRun: (workflowId: string, runId: string) =>
    apiClient.get(`workflows/${workflowId}/runs/${runId}`).json<any>(),
  getNodeExecutions: (workflowId: string, runId: string) =>
    apiClient.get(`workflows/${workflowId}/runs/${runId}/nodes`).json<any[]>(),
};
```

- [ ] **步骤 3：编写列表页**

```typescript
// apps/web/src/app/(dashboard)/workflows/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Workflow, workflowApi } from '@/api/workflow';

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);

  useEffect(() => {
    workflowApi.list().then(setWorkflows).catch(console.error);
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">工作流</h1>
        <Link href="/workflows/new" className="px-4 py-2 bg-primary text-white rounded-lg">
          新建工作流
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {workflows.map(wf => (
          <Link key={wf.id} href={`/workflows/${wf.id}/edit`}
                className="block p-4 border rounded-lg hover:shadow-md transition-shadow">
            <h3 className="font-semibold">{wf.name}</h3>
            {wf.description && <p className="text-sm text-muted-foreground mt-1">{wf.description}</p>}
            <p className="text-xs text-muted-foreground mt-2">
              更新于 {new Date(wf.updatedAt).toLocaleDateString()}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **步骤 4：新建页（简版——直接创建空画布）**

```typescript
// apps/web/src/app/(dashboard)/workflows/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { workflowApi } from '@/api/workflow';

export default function NewWorkflowPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const wf = await workflowApi.create({
      name,
      description,
      graph: {
        nodes: [
          { id: 'start', type: 'start', label: '开始', position: { x: 50, y: 200 }, config: {} },
          { id: 'end', type: 'end', label: '结束', position: { x: 500, y: 200 }, config: { output: '' } },
        ],
        edges: [{ id: 'e1', source: 'start', target: 'end' }],
      },
    });
    router.push(`/workflows/${wf.id}/edit`);
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">新建工作流</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">名称</label>
          <input value={name} onChange={e => setName(e.target.value)}
                 className="w-full px-3 py-2 border rounded-lg" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">描述</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg" rows={3} />
        </div>
        <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg">
          创建
        </button>
      </form>
    </div>
  );
}
```

- [ ] **步骤 5：画布编辑页（核心——React Flow 集成）**

```typescript
// apps/web/src/app/(dashboard)/workflows/[id]/edit/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ReactFlow, MiniMap, Controls, Background,
  useNodesState, useEdgesState, addEdge,
  type Node, type Edge, type Connection, type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { workflowApi } from '@/api/workflow';

// 各类型节点颜色
const nodeStyle: Record<string, { bg: string; border: string }> = {
  start: { bg: '#e6f7e6', border: '#52c41a' },
  end: { bg: '#fff1f0', border: '#ff4d4f' },
  llm: { bg: '#e6f4ff', border: '#1677ff' },
  code: { bg: '#f9f0ff', border: '#722ed1' },
  condition: { bg: '#fffbe6', border: '#faad14' },
  http_request: { bg: '#fff7e6', border: '#fa8c16' },
  knowledge_retrieval: { bg: '#e6fffb', border: '#13c2c2' },
  question_classifier: { bg: '#fff0f6', border: '#eb2f96' },
};

// 简单自定义节点
function CustomNode({ data }: { data: any }) {
  const style = nodeStyle[data.nodeType] || { bg: '#f5f5f5', border: '#d9d9d9' };
  return (
    <div className="px-4 py-2 rounded-lg shadow-sm text-sm font-medium"
         style={{ background: style.bg, border: `2px solid ${style.border}` }}>
      {data.label}
    </div>
  );
}

const nodeTypes: NodeTypes = { custom: CustomNode };

export default function WorkflowEditPage() {
  const params = useParams();
  const router = useRouter();
  const [name, setName] = useState('');
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [saving, setSaving] = useState(false);
  const [debugResult, setDebugResult] = useState<any>(null);

  useEffect(() => {
    workflowApi.get(params.id as string).then(wf => {
      setName(wf.name);
      // Convert workflows node format → React Flow
      const flowNodes: Node[] = (wf.graph.nodes || []).map(n => ({
        id: n.id,
        type: 'custom',
        position: n.position,
        data: { label: n.label, nodeType: n.type, config: n.config },
      }));
      const flowEdges: Edge[] = (wf.graph.edges || []).map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
      }));
      setNodes(flowNodes);
      setEdges(flowEdges);
    });
  }, [params.id]);

  const onConnect = useCallback((conn: Connection) => {
    setEdges(eds => addEdge({ ...conn, id: `e${Date.now()}` }, eds));
  }, [setEdges]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const graph = {
        nodes: nodes.map(n => ({
          id: n.id,
          type: (n.data as any).nodeType,
          label: (n.data as any).label,
          position: n.position,
          config: (n.data as any).config || {},
        })),
        edges: edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: (e as any).sourceHandle,
        })),
      };
      await workflowApi.update(params.id as string, { name, graph });
    } finally {
      setSaving(false);
    }
  };

  const handleDebug = async () => {
    try {
      const result = await workflowApi.executeDebug(params.id as string, { query: '' });
      setDebugResult(result);
    } catch (err) {
      console.error('Debug execution failed', err);
    }
  };

  return (
    <div className="h-[calc(100vh-60px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 p-2 border-b bg-background">
        <input value={name} onChange={e => setName(e.target.value)}
               className="text-lg font-semibold bg-transparent border-none outline-none" />
        <button onClick={handleSave} disabled={saving}
                className="px-3 py-1 bg-primary text-white rounded text-sm">
          {saving ? '保存中...' : '保存'}
        </button>
        <button onClick={handleDebug}
                className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-sm">
          调试运行
        </button>
        <button onClick={() => router.push(`/workflows/${params.id}/runs`)}
                className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground">
          运行历史
        </button>
      </div>

      {/* Canvas + Config Panel */}
      <div className="flex flex-1">
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
          >
            <MiniMap />
            <Controls />
            <Background />
          </ReactFlow>
        </div>
      </div>

      {/* Debug Result Panel */}
      {debugResult && (
        <div className="border-t p-4 bg-muted/50 max-h-60 overflow-auto">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold">调试结果 ({debugResult.status})</h3>
            <button onClick={() => setDebugResult(null)} className="text-sm text-muted-foreground">关闭</button>
          </div>
          {debugResult.nodeExecutions?.map((ne: any) => (
            <div key={ne.nodeId} className="flex items-center gap-2 text-sm py-1">
              <span className={`w-2 h-2 rounded-full ${ne.status === 'succeeded' ? 'bg-green-500' : ne.status === 'failed' ? 'bg-red-500' : 'bg-gray-400'}`} />
              <span className="font-medium">{ne.nodeId}</span>
              <span className="text-muted-foreground">({ne.nodeType})</span>
              {ne.latency != null && <span className="text-xs text-muted-foreground">{ne.latency}ms</span>}
              {ne.error && <span className="text-red-500 text-xs">{ne.error}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **步骤 6：运行历史页面**

```typescript
// apps/web/src/app/(dashboard)/workflows/[id]/runs/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { workflowApi } from '@/api/workflow';

export default function WorkflowRunsPage() {
  const params = useParams();
  const router = useRouter();
  const [runs, setRuns] = useState<any[]>([]);

  useEffect(() => {
    workflowApi.getRuns(params.id as string).then(setRuns).catch(console.error);
  }, [params.id]);

  const statusColor: Record<string, string> = {
    running: 'text-blue-500', succeeded: 'text-green-500', failed: 'text-red-500', cancelled: 'text-gray-500',
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.back()} className="text-sm text-muted-foreground">← 返回</button>
        <h1 className="text-2xl font-bold">运行历史</h1>
      </div>
      <div className="space-y-2">
        {runs.map(run => (
          <div key={run.id} className="flex items-center gap-4 p-3 border rounded-lg"
               onClick={() => router.push(`/workflows/${params.id}/runs/${run.id}`)}>
            <span className={`font-medium ${statusColor[run.status]}`}>{run.status}</span>
            <span className="text-sm">{new Date(run.createdAt).toLocaleString()}</span>
            {run.error && <span className="text-red-500 text-sm ml-auto">{run.error}</span>}
          </div>
        ))}
        {runs.length === 0 && <p className="text-muted-foreground">暂无运行记录</p>}
      </div>
    </div>
  );
}
```

- [ ] **步骤 7：Commit**

```bash
git add apps/web/src/app/(dashboard)/workflows/ apps/web/src/api/workflow.ts apps/web/package.json
git commit -m "feat: add workflow frontend with React Flow canvas editor"
```

---

## 自检清单

- [ ] 规格覆盖度：设计文档中每个需求都有对应任务（8 种节点类型 ✓, DAG 引擎 ✓, {{}} 变量解析 ✓, 调试执行 ✓, 图验证 ✓, CRUD API ✓）
- [ ] 占位符扫描：无 "TODO"、"待定"、空实现
- [ ] 类型一致性：所有接口和类型在上下游任务中保持一致
  - `ContextService.resolve()/resolveConfig()` 在任务 3 定义，任务 5/6 执行器使用 ✓
  - `NodeExecutor.execute()` 接口在任务 4 定义，任务 5/6 实现 ✓
  - `validateGraph()` / `topologicalSort()` 在任务 7 定义，任务 8 DagEngine 使用 ✓
  - `Workflow` / `WorkflowRun` / `WorkflowNodeExecution` 实体在任务 2 定义，任务 8/9/10 使用 ✓
