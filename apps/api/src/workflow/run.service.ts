import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DagEngineService } from './engine/dag-engine.service';
import { WorkflowNodeExecution } from './entities/workflow-node-execution.entity';
import { WorkflowRun } from './entities/workflow-run.entity';
import { WorkflowService } from './workflow.service';

@Injectable()
export class RunService {
  constructor(
    @InjectRepository(WorkflowRun)
    private readonly runRepo: Repository<WorkflowRun>,
    @InjectRepository(WorkflowNodeExecution)
    private readonly nodeExecRepo: Repository<WorkflowNodeExecution>,
    private readonly workflowService: WorkflowService,
    private readonly dagEngine: DagEngineService
  ) {}

  async execute(workflowId: string, inputs: Record<string, any>): Promise<WorkflowRun> {
    const wf = await this.workflowService.findOne(workflowId);
    return this.dagEngine.executeWorkflow(wf, inputs, 'api');
  }

  async executeDebug(workflowId: string, inputs: Record<string, any>) {
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
