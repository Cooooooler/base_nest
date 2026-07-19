import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowNodeExecution } from '../entities/workflow-node-execution.entity';
import { WorkflowRun } from '../entities/workflow-run.entity';
import { Workflow, WorkflowEdge, WorkflowNode } from '../entities/workflow.entity';
import { ContextService } from './context.service';
import { NodeExecutor } from './executor/node-executor.interface';
import { topologicalSort, validateGraph } from './graph-validator';

export const ALL_EXECUTORS = 'ALL_EXECUTORS';

@Injectable()
export class DagEngineService {
  private readonly logger = new Logger(DagEngineService.name);
  private readonly executorMap: Map<string, NodeExecutor>;

  constructor(
    @InjectRepository(WorkflowRun)
    private readonly runRepo: Repository<WorkflowRun>,
    @InjectRepository(WorkflowNodeExecution)
    private readonly nodeExecRepo: Repository<WorkflowNodeExecution>,
    @Inject(ALL_EXECUTORS) executors: NodeExecutor[]
  ) {
    this.executorMap = new Map<string, NodeExecutor>();
    for (const exec of executors) {
      this.executorMap.set(exec.type, exec);
    }
  }

  async executeWorkflow(
    workflow: Workflow,
    inputs: Record<string, any>,
    triggeredBy: 'api' | 'manual'
  ): Promise<WorkflowRun> {
    validateGraph(workflow.graph);

    const run = await this.runRepo.save(
      this.runRepo.create({
        workflowId: workflow.id,
        status: 'running',
        inputs,
        triggeredBy,
        startedAt: new Date(),
      })
    );

    // Execute in background
    this.runExecution(workflow, run, inputs).catch((err) => {
      this.logger.error(`Workflow ${workflow.id} execution failed: ${(err as Error).message}`);
    });

    return run;
  }

  async executeWorkflowDebug(
    workflow: Workflow,
    inputs: Record<string, any>
  ): Promise<{ run: WorkflowRun; nodeExecutions: WorkflowNodeExecution[] }> {
    validateGraph(workflow.graph);

    const run = await this.runRepo.save(
      this.runRepo.create({
        workflowId: workflow.id,
        status: 'running',
        inputs,
        triggeredBy: 'manual',
        startedAt: new Date(),
      })
    );

    const nodeExecutions = await this.runExecution(workflow, run, inputs);
    return { run, nodeExecutions };
  }

  private async runExecution(
    workflow: Workflow,
    run: WorkflowRun,
    inputs: Record<string, any>
  ): Promise<WorkflowNodeExecution[]> {
    const { nodes, edges } = workflow.graph;
    const context = new ContextService(inputs);
    const nodeExecutions: WorkflowNodeExecution[] = [];

    try {
      const layers = topologicalSort(nodes, edges);
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));

      for (const layer of layers) {
        const promises = layer.map((nodeId) =>
          this.executeNode(nodeId, nodeMap.get(nodeId)!, edges, context, run.id, nodeExecutions)
        );
        await Promise.all(promises);
      }

      const endNode = nodes.find((n) => n.type === 'end');
      if (endNode) {
        const endOutput = context.resolve(`{{nodes.${endNode.id}.output}}`);
        run.outputs = typeof endOutput === 'object' ? endOutput : { result: endOutput };
      }
      run.status = 'succeeded';
    } catch (err) {
      this.logger.error(`Workflow execution error: ${(err as Error).message}`);
      run.status = 'failed';
      run.error = (err as Error).message;

      for (const ne of nodeExecutions) {
        if (ne.status === 'pending' || ne.status === 'running') {
          ne.status = 'skipped';
          ne.completedAt = new Date();
        }
      }
    }

    run.completedAt = new Date();
    await this.runRepo.save(run);
    await Promise.all(nodeExecutions.map((ne) => this.nodeExecRepo.save(ne)));

    return nodeExecutions;
  }

  private async executeNode(
    nodeId: string,
    node: WorkflowNode,
    edges: WorkflowEdge[],
    context: ContextService,
    runId: string,
    nodeExecutions: WorkflowNodeExecution[]
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

      if (node.type === 'condition') {
        const outEdges = edges.filter((e) => e.source === node.id);
        const matching = outEdges.filter((e) => e.sourceHandle === String(result.outputs.result));
        if (matching.length === 0) {
          this.logger.warn(
            `Condition node ${node.id} has no matching edge for result=${result.outputs.result}`
          );
        }
      } else if (node.type === 'question_classifier') {
        const outEdges = edges.filter((e) => e.source === node.id);
        const matching = outEdges.filter((e) => e.sourceHandle === result.outputs.category);
        if (matching.length === 0) {
          this.markDownstreamSkipped(node.id, edges, runId, nodeExecutions);
        }
      }
    } catch (err) {
      execution.status = 'failed';
      execution.error = (err as Error).message;
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
    nodeExecutions: WorkflowNodeExecution[]
  ): void {
    const queue = edges.filter((e) => e.source === nodeId).map((e) => e.target);
    while (queue.length > 0) {
      const targetId = queue.shift()!;
      const existing = nodeExecutions.find((e) => e.nodeId === targetId);
      if (existing?.status === 'pending') {
        existing.status = 'skipped';
      }
      queue.push(...edges.filter((e) => e.source === targetId).map((e) => e.target));
    }
  }
}
