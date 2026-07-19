import { login, logout, register } from './auth';
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

describe('auth API', () => {
  beforeEach(() => {
    mockApiClient.mockReset();
  });

  it('login 调用 POST /auth/login', async () => {
    mockApiClient.mockResolvedValue({
      accessToken: 'at-1',
      refreshToken: 'rt-1',
      user: { id: '1', email: 'a@b.com', name: 'Alice' },
    });
    const result = await login('a@b.com', 'pwd123');
    expect(mockApiClient).toHaveBeenCalledWith('/auth/login', {
      method: 'POST',
      json: { email: 'a@b.com', password: 'pwd123' },
    });
    expect(result.accessToken).toBe('at-1');
  });

  it('register 调用 POST /auth/register', async () => {
    mockApiClient.mockResolvedValue({
      accessToken: 'at-2',
      refreshToken: 'rt-2',
      user: { id: '2', email: 'b@c.com', name: 'Bob' },
    });
    const result = await register('b@c.com', 'Bob', 'pwd456');
    expect(mockApiClient).toHaveBeenCalledWith('/auth/register', {
      method: 'POST',
      json: { email: 'b@c.com', name: 'Bob', password: 'pwd456' },
    });
    expect(result.accessToken).toBe('at-2');
  });

  it('logout 调用 POST /auth/logout', async () => {
    mockApiClient.mockResolvedValue(undefined);
    await logout('rt-1');
    expect(mockApiClient).toHaveBeenCalledWith('/auth/logout', {
      method: 'POST',
      json: { refreshToken: 'rt-1' },
    });
  });

  it('login 失败时抛 ApiError', async () => {
    mockApiClient.mockRejectedValue(
      new (jest.requireActual('./client').ApiError)(401, 0, '邮箱或密码错误')
    );
    await expect(login('bad@b.com', 'wrong')).rejects.toThrow('邮箱或密码错误');
  });
});
