import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthGuardModule } from '../auth/auth-guard.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { ProvidersModule } from '../providers/providers.module';
import { ContextService } from './engine/context.service';
import { DagEngineService } from './engine/dag-engine.service';
import { CodeNodeExecutor } from './engine/executor/code-node.executor';
import { ConditionNodeExecutor } from './engine/executor/condition-node.executor';
import { EndNodeExecutor } from './engine/executor/end-node.executor';
import { HttpRequestNodeExecutor } from './engine/executor/http-request-node.executor';
import { KnowledgeRetrievalNodeExecutor } from './engine/executor/knowledge-retrieval-node.executor';
import { LLMNodeExecutor } from './engine/executor/llm-node.executor';
import { QuestionClassifierNodeExecutor } from './engine/executor/question-classifier-node.executor';
import { StartNodeExecutor } from './engine/executor/start-node.executor';
import { WorkflowNodeExecution } from './entities/workflow-node-execution.entity';
import { WorkflowRun } from './entities/workflow-run.entity';
import { Workflow } from './entities/workflow.entity';
import { RunController } from './run.controller';
import { RunService } from './run.service';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';

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
})
export class WorkflowModule {}
