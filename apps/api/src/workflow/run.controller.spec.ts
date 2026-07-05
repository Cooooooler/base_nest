import { CanActivate } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RunController } from './run.controller';
import { RunService } from './run.service';

describe('RunController', () => {
  let controller: RunController;
  const mockService = {
    execute: jest.fn().mockResolvedValue({ id: 'run-1', status: 'running' }),
    executeDebug: jest.fn().mockResolvedValue({
      run: { id: 'run-1', status: 'succeeded', outputs: null },
      nodeExecutions: [],
    }),
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
    const result = await controller.execute('wf-1', { inputs: {} }, { user: { id: 'u1' } } as any);
    expect(result.runId).toBe('run-1');
  });

  it('executeDebug should return full result', async () => {
    const result = await controller.executeDebug('wf-1', { inputs: {} }, { user: { id: 'u1' } } as any);
    expect(result.runId).toBe('run-1');
    expect(result.nodeExecutions).toEqual([]);
  });
});
