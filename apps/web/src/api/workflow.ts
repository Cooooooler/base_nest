import { apiClient } from './client';

export interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
  config: Record<string, any>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  graph: WorkflowGraph;
  createdAt: string;
  updatedAt: string;
}

export const workflowApi = {
  list: () => apiClient<Workflow[]>('workflows'),
  get: (id: string) => apiClient<Workflow>(`workflows/${id}`),
  create: (data: { name: string; description?: string; graph: WorkflowGraph }) =>
    apiClient<Workflow>('workflows', { method: 'POST', json: data }),
  update: (
    id: string,
    data: Partial<{ name: string; description: string; graph: WorkflowGraph }>
  ) => apiClient<Workflow>(`workflows/${id}`, { method: 'PATCH', json: data }),
  delete: (id: string) => apiClient<void>(`workflows/${id}`, { method: 'DELETE' }),
  execute: (id: string, inputs: Record<string, any>) =>
    apiClient<{ runId: string; status: string }>(`workflows/${id}/runs`, {
      method: 'POST',
      json: { inputs },
    }),
  executeDebug: (id: string, inputs: Record<string, any>) =>
    apiClient<any>(`workflows/${id}/runs/debug`, { method: 'POST', json: { inputs } }),
  getRuns: (id: string) => apiClient<any[]>(`workflows/${id}/runs`),
  getRun: (workflowId: string, runId: string) =>
    apiClient<any>(`workflows/${workflowId}/runs/${runId}`),
  getNodeExecutions: (workflowId: string, runId: string) =>
    apiClient<any[]>(`workflows/${workflowId}/runs/${runId}/nodes`),
};
