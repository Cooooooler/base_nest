import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { fromPartial } from '@total-typescript/shoehorn';
import { RetrievalService } from '../../knowledge/retrieval.service';
import { ProvidersService } from '../../providers/providers.service';
import { WorkflowNodeExecution } from '../entities/workflow-node-execution.entity';
import { WorkflowRun } from '../entities/workflow-run.entity';
import { Workflow } from '../entities/workflow.entity';
import { ALL_EXECUTORS, DagEngineService } from './dag-engine.service';
import { CodeNodeExecutor } from './executor/code-node.executor';
import { ConditionNodeExecutor } from './executor/condition-node.executor';
import { EndNodeExecutor } from './executor/end-node.executor';
import { HttpRequestNodeExecutor } from './executor/http-request-node.executor';
import { KnowledgeRetrievalNodeExecutor } from './executor/knowledge-retrieval-node.executor';
import { LLMNodeExecutor } from './executor/llm-node.executor';
import { QuestionClassifierNodeExecutor } from './executor/question-classifier-node.executor';
import { StartNodeExecutor } from './executor/start-node.executor';

describe('DagEngineService', () => {
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
      chat: jest.fn().mockResolvedValue({
        content: 'AI reply',
        usage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 },
      }),
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
        {
          provide: ALL_EXECUTORS,
          useFactory: (
            startNodeExecutor: StartNodeExecutor,
            endNodeExecutor: EndNodeExecutor,
            llmNodeExecutor: LLMNodeExecutor,
            codeNodeExecutor: CodeNodeExecutor,
            conditionNodeExecutor: ConditionNodeExecutor,
            httpRequestNodeExecutor: HttpRequestNodeExecutor
          ) => [
            startNodeExecutor,
            endNodeExecutor,
            llmNodeExecutor,
            codeNodeExecutor,
            conditionNodeExecutor,
            httpRequestNodeExecutor,
            new KnowledgeRetrievalNodeExecutor(mockRetrievalService as any),
            new QuestionClassifierNodeExecutor(mockProvidersService as any),
          ],
          inject: [
            StartNodeExecutor,
            EndNodeExecutor,
            LLMNodeExecutor,
            CodeNodeExecutor,
            ConditionNodeExecutor,
            HttpRequestNodeExecutor,
          ],
        },
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
          {
            id: 'llm_1',
            type: 'llm',
            label: 'LLM',
            position: { x: 100, y: 0 },
            config: { providerId: 'p1', model: 'gpt-4o', prompt: 'hi' },
          },
          {
            id: 'end',
            type: 'end',
            label: 'End',
            position: { x: 200, y: 0 },
            config: { output: '{{nodes.llm_1.output.content}}' },
          },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'llm_1' },
          { id: 'e2', source: 'llm_1', target: 'end' },
        ],
      },
    });

    const { run, nodeExecutions } = await engine.executeWorkflowDebug(wf, { query: 'test' });
    expect(run.status).toBe('succeeded');
    expect(nodeExecutions).toHaveLength(3);
    expect(nodeExecutions.every((n) => n.status === 'succeeded')).toBe(true);
    // The run.outputs should contain the end node result
    expect(run.outputs).toBeDefined();
  });

  it('should execute workflow asynchronously', async () => {
    const wf = fromPartial<Workflow>({
      id: 'wf-async',
      graph: {
        nodes: [
          { id: 'start', type: 'start', label: 'Start', position: { x: 0, y: 0 }, config: {} },
          {
            id: 'end',
            type: 'end',
            label: 'End',
            position: { x: 100, y: 0 },
            config: { output: 'done' },
          },
        ],
        edges: [{ id: 'e1', source: 'start', target: 'end' }],
      },
    });

    const run = await engine.executeWorkflow(wf, { q: 'test' }, 'api');
    expect(run.status).toBe('running');
    expect(run.triggeredBy).toBe('api');
  });

  it('should handle workflow with condition node', async () => {
    const wf = fromPartial<Workflow>({
      id: 'wf-2',
      graph: {
        nodes: [
          { id: 'start', type: 'start', label: 'Start', position: { x: 0, y: 0 }, config: {} },
          {
            id: 'cond',
            type: 'condition',
            label: 'Condition',
            position: { x: 100, y: 0 },
            config: { expression: '1 > 0' },
          },
          {
            id: 'end',
            type: 'end',
            label: 'End',
            position: { x: 200, y: 0 },
            config: { output: 'done' },
          },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'cond' },
          { id: 'e2', source: 'cond', target: 'end', sourceHandle: 'true' },
        ],
      },
    });

    const { run } = await engine.executeWorkflowDebug(wf, {});
    expect(run.status).toBe('succeeded');
  });

  it('should handle workflow with parallel branches', async () => {
    const wf = fromPartial<Workflow>({
      id: 'wf-3',
      graph: {
        nodes: [
          { id: 'start', type: 'start', label: 'Start', position: { x: 0, y: 0 }, config: {} },
          {
            id: 'llm_1',
            type: 'llm',
            label: 'LLM 1',
            position: { x: 100, y: 0 },
            config: { providerId: 'p1', model: 'gpt-4o', prompt: 'hi' },
          },
          {
            id: 'llm_2',
            type: 'llm',
            label: 'LLM 2',
            position: { x: 100, y: 100 },
            config: { providerId: 'p1', model: 'gpt-4o', prompt: 'hi' },
          },
          {
            id: 'end',
            type: 'end',
            label: 'End',
            position: { x: 300, y: 0 },
            config: { output: 'done' },
          },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'llm_1' },
          { id: 'e2', source: 'start', target: 'llm_2' },
          { id: 'e3', source: 'llm_1', target: 'end' },
          { id: 'e4', source: 'llm_2', target: 'end' },
        ],
      },
    });

    const { nodeExecutions } = await engine.executeWorkflowDebug(wf, {});
    expect(nodeExecutions).toHaveLength(4);
    expect(nodeExecutions.every((n) => n.status === 'succeeded')).toBe(true);
  });

  it('should fail workflow on executor error', async () => {
    mockProvidersService.getProviderClient.mockRejectedValueOnce(new Error('Provider unavailable'));
    const wf = fromPartial<Workflow>({
      id: 'wf-err',
      graph: {
        nodes: [
          { id: 'start', type: 'start', label: 'Start', position: { x: 0, y: 0 }, config: {} },
          {
            id: 'bad',
            type: 'llm',
            label: 'Bad',
            position: { x: 100, y: 0 },
            config: { providerId: 'p1', model: 'gpt-4o', prompt: 'hi' },
          },
          {
            id: 'end',
            type: 'end',
            label: 'End',
            position: { x: 200, y: 0 },
            config: { output: 'done' },
          },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'bad' },
          { id: 'e2', source: 'bad', target: 'end' },
        ],
      },
    });

    const { run, nodeExecutions } = await engine.executeWorkflowDebug(wf, {});
    expect(run.status).toBe('failed');
    expect(nodeExecutions.find((n) => n.nodeId === 'bad')?.status).toBe('failed');
  });

  it('should handle condition node with no matching edge', async () => {
    const wf = fromPartial<Workflow>({
      id: 'wf-cond-nomatch',
      graph: {
        nodes: [
          { id: 'start', type: 'start', label: 'Start', position: { x: 0, y: 0 }, config: {} },
          {
            id: 'cond',
            type: 'condition',
            label: 'Condition',
            position: { x: 100, y: 0 },
            config: { expression: '1 > 2' },
          },
          {
            id: 'end',
            type: 'end',
            label: 'End',
            position: { x: 200, y: 0 },
            config: { output: 'done' },
          },
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'cond' },
          // Only a 'true' edge, but expression evaluates to false
          { id: 'e2', source: 'cond', target: 'end', sourceHandle: 'true' },
        ],
      },
    });

    const { run } = await engine.executeWorkflowDebug(wf, {});
    expect(run.status).toBe('succeeded');
  });
});
