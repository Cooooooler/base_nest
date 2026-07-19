import { useAuthStore } from '@/store/auth-store';
import { ApiError, getAccessToken } from './client';

// ky is ESM-only — mock it so Jest can parse client.ts without transforming ESM
jest.mock('ky', () => ({
  create: jest.fn(() => jest.fn()),
}));

beforeEach(() => {
  useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
});

describe('ApiError', () => {
  it('构造 ApiError 实例', () => {
    const err = new ApiError(401, 0, 'Unauthorized');
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(401);
    expect(err.code).toBe(0);
    expect(err.message).toBe('Unauthorized');
    expect(err.name).toBe('ApiError');
  });
});

describe('getAccessToken', () => {
  it('SSR 环境返回 null', () => {
    // 模拟 window 不存在
    const originalWindow = (global as any).window;
    delete (global as any).window;
    expect(getAccessToken()).toBeNull();
    (global as any).window = originalWindow;
  });

  it('store 有 token 时返回 accessToken', () => {
    useAuthStore.getState().setTokens('test-token', 'refresh');
    const token = getAccessToken();
    expect(token).toBe('test-token');
  });

  it('store 无 token 时返回 null', () => {
    expect(getAccessToken()).toBeNull();
  });
});
