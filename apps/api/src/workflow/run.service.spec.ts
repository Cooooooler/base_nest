import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { fromPartial } from '@total-typescript/shoehorn';
import { DagEngineService } from './engine/dag-engine.service';
import { WorkflowNodeExecution } from './entities/workflow-node-execution.entity';
import { WorkflowRun } from './entities/workflow-run.entity';
import { RunService } from './run.service';
import { WorkflowService } from './workflow.service';

describe('RunService', () => {
  const mockRunRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOneBy: jest
      .fn()
      .mockResolvedValue(fromPartial<WorkflowRun>({ id: 'run-1', status: 'succeeded' })),
  };
  const mockNodeExecRepo = {
    find: jest.fn().mockResolvedValue([]),
  };
  const mockWorkflowService = {
    findOne: jest.fn().mockResolvedValue({ id: 'wf-1', graph: { nodes: [], edges: [] } }),
  };
  const mockDagEngine = {
    executeWorkflow: jest
      .fn()
      .mockResolvedValue(fromPartial<WorkflowRun>({ id: 'run-1', status: 'running' })),
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

  it('should list runs by workflow', async () => {
    const result = await service.findByWorkflow('wf-1');
    expect(result).toEqual([]);
  });

  it('should find node executions', async () => {
    const result = await service.findNodeExecutions('run-1');
    expect(result).toEqual([]);
  });
});
