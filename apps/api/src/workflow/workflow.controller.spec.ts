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
