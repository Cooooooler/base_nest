import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { fromPartial } from '@total-typescript/shoehorn';
import { Workflow } from './entities/workflow.entity';
import { WorkflowService } from './workflow.service';

describe('WorkflowService', () => {
  const validGraph = {
    nodes: [
      { id: 'start', type: 'start', label: 'S', position: { x: 0, y: 0 }, config: {} },
      { id: 'end', type: 'end', label: 'E', position: { x: 100, y: 0 }, config: {} },
    ],
    edges: [{ id: 'e1', source: 'start', target: 'end' }],
  };

  const mockWorkflow = fromPartial<Workflow>({
    id: 'wf-1',
    name: 'Test',
    userId: 'user-1',
    graph: validGraph,
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
      providers: [WorkflowService, { provide: getRepositoryToken(Workflow), useValue: mockRepo }],
    }).compile();
    service = module.get(WorkflowService);
  });

  it('findAll should return workflows', async () => {
    const result = await service.findAll('user-1');
    expect(result).toEqual([mockWorkflow]);
  });

  it('create should validate graph and save', async () => {
    const dto: any = { name: 'Test', graph: validGraph };
    const result = await service.create('user-1', dto);
    expect(result).toBeDefined();
  });

  it('findOne should throw on missing', async () => {
    mockRepo.findOneBy.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });

  it('delete should remove workflow', async () => {
    mockRepo.findOneBy.mockResolvedValue(mockWorkflow);
    await service.delete('wf-1', 'user-1');
    expect(mockRepo.delete).toHaveBeenCalledWith('wf-1');
  });
});
