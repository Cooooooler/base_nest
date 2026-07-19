import {
  createApp,
  createConversation,
  deleteApp,
  getApp,
  getApps,
  getConversations,
  getMessages,
  updateApp,
} from './chat';
import { apiClient } from './client';

// ky 是纯 ESM 模块，mock 它以避免 Jest 解析错误
jest.mock('ky', () => ({
  create: jest.fn(() => jest.fn()),
}));

jest.mock('./client', () => ({
  apiClient: jest.fn(),
  getAccessToken: jest.fn(),
  ApiError: jest.requireActual('./client').ApiError,
}));

const mockApiClient = apiClient as jest.MockedFunction<typeof apiClient>;

describe('chat API — Apps', () => {
  beforeEach(() => {
    mockApiClient.mockReset();
  });

  it('getApps 调用 GET /apps', async () => {
    mockApiClient.mockResolvedValue([]);
    await getApps();
    expect(mockApiClient).toHaveBeenCalledWith('/apps');
  });

  it('getApp 调用 GET /apps/:id', async () => {
    mockApiClient.mockResolvedValue({ id: '1', name: 'Test' });
    const result = await getApp('1');
    expect(mockApiClient).toHaveBeenCalledWith('/apps/1');
    expect(result.name).toBe('Test');
  });

  it('createApp 调用 POST /apps', async () => {
    mockApiClient.mockResolvedValue({ id: '2', name: 'New' });
    const dto = { name: 'New', providerId: 'p1', modelId: 'm1' };
    await createApp(dto);
    expect(mockApiClient).toHaveBeenCalledWith('/apps', { method: 'POST', json: dto });
  });

  it('updateApp 调用 PATCH /apps/:id', async () => {
    mockApiClient.mockResolvedValue({ id: '1', name: 'Updated' });
    await updateApp('1', { name: 'Updated' });
    expect(mockApiClient).toHaveBeenCalledWith('/apps/1', {
      method: 'PATCH',
      json: { name: 'Updated' },
    });
  });

  it('deleteApp 调用 DELETE /apps/:id', async () => {
    mockApiClient.mockResolvedValue(undefined);
    await deleteApp('1');
    expect(mockApiClient).toHaveBeenCalledWith('/apps/1', { method: 'DELETE' });
  });
});

describe('chat API — Conversations', () => {
  it('getConversations 调用 GET /apps/:id/conversations', async () => {
    mockApiClient.mockResolvedValue([]);
    await getConversations('app-1');
    expect(mockApiClient).toHaveBeenCalledWith('/apps/app-1/conversations');
  });

  it('createConversation 调用 POST /apps/:id/conversations', async () => {
    mockApiClient.mockResolvedValue({ id: 'c1', title: 'Chat' });
    await createConversation('app-1', 'Chat');
    expect(mockApiClient).toHaveBeenCalledWith('/apps/app-1/conversations', {
      method: 'POST',
      json: { title: 'Chat' },
    });
  });
});

describe('chat API — Messages', () => {
  it('getMessages 调用 GET /apps/:id/conversations/:convId/messages', async () => {
    mockApiClient.mockResolvedValue([]);
    await getMessages('app-1', 'conv-1');
    expect(mockApiClient).toHaveBeenCalledWith('/apps/app-1/conversations/conv-1/messages');
  });
});
