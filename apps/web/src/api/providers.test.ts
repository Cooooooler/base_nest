import { getProviders, getProvider, createProvider, deleteProvider, getProviderApiKeys, createApiKey, deleteApiKey, getProviderModels, createModel, updateModel, deleteModel, getPresetModels } from './providers';
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

describe('providers API', () => {
  beforeEach(() => { mockApiClient.mockReset(); });

  it('getProviders', async () => {
    mockApiClient.mockResolvedValue([]);
    await getProviders();
    expect(mockApiClient).toHaveBeenCalledWith('/providers');
  });

  it('getProvider', async () => {
    mockApiClient.mockResolvedValue({ id: '1', name: 'OpenAI', type: 'openai' });
    const result = await getProvider('1');
    expect(mockApiClient).toHaveBeenCalledWith('/providers/1');
    expect(result.name).toBe('OpenAI');
  });

  it('createProvider', async () => {
    mockApiClient.mockResolvedValue({ id: '2', name: 'New', type: 'openai' });
    const dto = { name: 'New', type: 'openai' as const };
    await createProvider(dto as any);
    expect(mockApiClient).toHaveBeenCalledWith('/providers', { method: 'POST', json: dto });
  });

  it('deleteProvider', async () => {
    mockApiClient.mockResolvedValue(undefined);
    await deleteProvider('1');
    expect(mockApiClient).toHaveBeenCalledWith('/providers/1', { method: 'DELETE' });
  });

  it('getProviderApiKeys', async () => {
    mockApiClient.mockResolvedValue([]);
    await getProviderApiKeys('1');
    expect(mockApiClient).toHaveBeenCalledWith('/providers/1/keys');
  });

  it('createApiKey', async () => {
    mockApiClient.mockResolvedValue({ id: 'k1', maskedKey: 'sk-****' });
    await createApiKey('1', { name: 'My Key', key: 'sk-xxx' });
    expect(mockApiClient).toHaveBeenCalledWith('/providers/1/keys', { method: 'POST', json: { name: 'My Key', key: 'sk-xxx' } });
  });

  it('deleteApiKey', async () => {
    mockApiClient.mockResolvedValue(undefined);
    await deleteApiKey('k1');
    expect(mockApiClient).toHaveBeenCalledWith('/providers/keys/k1', { method: 'DELETE' });
  });

  it('getProviderModels', async () => {
    mockApiClient.mockResolvedValue([]);
    await getProviderModels('1');
    expect(mockApiClient).toHaveBeenCalledWith('/providers/1/models');
  });

  it('createModel', async () => {
    mockApiClient.mockResolvedValue({ id: 'm1', name: 'gpt-4' });
    await createModel('1', { name: 'gpt-4', model: 'gpt-4' });
    expect(mockApiClient).toHaveBeenCalledWith('/providers/1/models', { method: 'POST', json: { name: 'gpt-4', model: 'gpt-4' } });
  });

  it('updateModel', async () => {
    mockApiClient.mockResolvedValue({ id: 'm1', name: 'gpt-4-turbo' });
    await updateModel('1', 'm1', { name: 'gpt-4-turbo' });
    expect(mockApiClient).toHaveBeenCalledWith('/providers/1/models/m1', { method: 'PATCH', json: { name: 'gpt-4-turbo' } });
  });

  it('deleteModel', async () => {
    mockApiClient.mockResolvedValue(undefined);
    await deleteModel('1', 'm1');
    expect(mockApiClient).toHaveBeenCalledWith('/providers/1/models/m1', { method: 'DELETE' });
  });

  it('getPresetModels', async () => {
    mockApiClient.mockResolvedValue([]);
    await getPresetModels('openai');
    expect(mockApiClient).toHaveBeenCalledWith('/providers/preset-models?type=openai');
  });
});
