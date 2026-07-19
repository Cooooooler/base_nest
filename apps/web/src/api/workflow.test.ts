import { workflowApi } from './workflow';
import { apiClient } from './client';

// ky 是纯 ESM 模块，mock 它以避免 Jest 解析错误
jest.mock('ky', () => ({
  create: jest.fn(() => jest.fn()),
}));

jest.mock('./client', () => ({
  apiClient: jest.fn(),
  ApiError: jest.requireActual('./client').ApiError,
}));

const mockApiClient = apiClient as jest.MockedFunction<typeof apiClient>;

const mockWorkflow = {
  id: 'wf-1', name: 'Test', description: 'Desc',
  graph: { nodes: [], edges: [] },
  createdAt: '2024-01-01', updatedAt: '2024-01-01',
};

describe('workflowApi', () => {
  beforeEach(() => { mockApiClient.mockReset(); });

  it('list', async () => {
    mockApiClient.mockResolvedValue([mockWorkflow]);
    const result = await workflowApi.list();
    expect(mockApiClient).toHaveBeenCalledWith('workflows');
    expect(result).toHaveLength(1);
  });

  it('get', async () => {
    mockApiClient.mockResolvedValue(mockWorkflow);
    await workflowApi.get('wf-1');
    expect(mockApiClient).toHaveBeenCalledWith('workflows/wf-1');
  });

  it('create', async () => {
    mockApiClient.mockResolvedValue(mockWorkflow);
    const data = { name: 'Test', graph: { nodes: [], edges: [] } };
    await workflowApi.create(data);
    expect(mockApiClient).toHaveBeenCalledWith('workflows', { method: 'POST', json: data });
  });

  it('update', async () => {
    mockApiClient.mockResolvedValue(mockWorkflow);
    await workflowApi.update('wf-1', { name: 'Updated' });
    expect(mockApiClient).toHaveBeenCalledWith('workflows/wf-1', { method: 'PATCH', json: { name: 'Updated' } });
  });

  it('delete', async () => {
    mockApiClient.mockResolvedValue(undefined);
    await workflowApi.delete('wf-1');
    expect(mockApiClient).toHaveBeenCalledWith('workflows/wf-1', { method: 'DELETE' });
  });

  it('execute', async () => {
    mockApiClient.mockResolvedValue({ runId: 'run-1', status: 'running' });
    const result = await workflowApi.execute('wf-1', { input: 'x' });
    expect(mockApiClient).toHaveBeenCalledWith('workflows/wf-1/runs', { method: 'POST', json: { inputs: { input: 'x' } } });
    expect(result.runId).toBe('run-1');
  });

  it('getRuns', async () => {
    mockApiClient.mockResolvedValue([]);
    await workflowApi.getRuns('wf-1');
    expect(mockApiClient).toHaveBeenCalledWith('workflows/wf-1/runs');
  });

  it('getRun', async () => {
    mockApiClient.mockResolvedValue({ id: 'run-1', status: 'completed' });
    await workflowApi.getRun('wf-1', 'run-1');
    expect(mockApiClient).toHaveBeenCalledWith('workflows/wf-1/runs/run-1');
  });

  it('getNodeExecutions', async () => {
    mockApiClient.mockResolvedValue([]);
    await workflowApi.getNodeExecutions('wf-1', 'run-1');
    expect(mockApiClient).toHaveBeenCalledWith('workflows/wf-1/runs/run-1/nodes');
  });
});
