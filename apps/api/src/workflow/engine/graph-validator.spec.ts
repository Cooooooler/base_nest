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

  it('should reject disconnected graph (start cannot reach end)', () => {
    expect(() => validateGraph({
      nodes: [makeNode('start', 'start'), makeNode('middle', 'llm'), makeNode('end', 'end')],
      edges: [],
    })).toThrow(BadRequestException);
  });
});
