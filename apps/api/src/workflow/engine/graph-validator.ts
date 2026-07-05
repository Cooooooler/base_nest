import { BadRequestException } from '@nestjs/common';
import { WorkflowEdge, WorkflowGraph, WorkflowNode } from '../entities/workflow.entity';
import { NODE_TYPES, NodeType } from '../types';

export interface ValidationError {
  field: string;
  message: string;
}

export function validateGraph(graph: WorkflowGraph): void {
  const errors: ValidationError[] = [];
  const { nodes, edges } = graph;

  if (!nodes || nodes.length === 0) {
    throw new BadRequestException('Nodes array must not be empty');
  }

  const starts = nodes.filter((n) => n.type === 'start');
  if (starts.length !== 1) {
    errors.push({
      field: 'nodes',
      message: `Must have exactly one start node, found ${starts.length}`,
    });
  }

  const ends = nodes.filter((n) => n.type === 'end');
  if (ends.length !== 1) {
    errors.push({
      field: 'nodes',
      message: `Must have exactly one end node, found ${ends.length}`,
    });
  }

  const ids = nodes.map((n) => n.id);
  if (new Set(ids).size !== ids.length) {
    errors.push({ field: 'nodes', message: 'Node IDs must be unique' });
  }

  for (const node of nodes) {
    if (!NODE_TYPES.includes(node.type as NodeType)) {
      errors.push({ field: `nodes.${node.id}.type`, message: `Invalid node type: ${node.type}` });
    }
  }

  const idSet = new Set(ids);
  for (const edge of edges) {
    if (!idSet.has(edge.source)) {
      errors.push({
        field: `edges.${edge.id}.source`,
        message: `Source node ${edge.source} not found`,
      });
    }
    if (!idSet.has(edge.target)) {
      errors.push({
        field: `edges.${edge.id}.target`,
        message: `Target node ${edge.target} not found`,
      });
    }
  }

  for (const node of nodes) {
    if (node.type === 'condition') {
      const outEdges = edges.filter((e) => e.source === node.id);
      for (const edge of outEdges) {
        if (!edge.sourceHandle) {
          errors.push({
            field: `edges.${edge.id}.sourceHandle`,
            message: 'Condition node edges must have sourceHandle',
          });
        }
      }
    }
  }

  try {
    topologicalSort(nodes, edges);
  } catch {
    errors.push({ field: 'graph', message: 'Workflow contains a cycle' });
  }

  const startNode = nodes.find((n) => n.type === 'start');
  const endNode = nodes.find((n) => n.type === 'end');
  if (startNode && endNode && !isReachable(startNode.id, endNode.id, edges, idSet)) {
    errors.push({ field: 'graph', message: 'Start node cannot reach end node' });
  }

  if (errors.length > 0) {
    throw new BadRequestException(errors.map((e) => e.message).join('; '));
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
    if (adjList[e.source]) {
      adjList[e.source].push(e.target);
    }
    if (inDegree[e.target] !== undefined) {
      inDegree[e.target]++;
    }
  }

  const layers: string[][] = [];
  let queue = nodes.filter((n) => inDegree[n.id] === 0).map((n) => n.id);

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
  startId: string,
  endId: string,
  edges: WorkflowEdge[],
  idSet: Set<string>
): boolean {
  const visited = new Set<string>();
  const queue = [startId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === endId) return true;
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
