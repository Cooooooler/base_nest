import { useAuthStore } from './auth-store';

beforeEach(() => {
  useAuthStore.setState({
    accessToken: null,
    refreshToken: null,
    user: null,
  });
  localStorage.clear();
});

describe('AuthStore', () => {
  it('初始状态 token 和 user 均为 null', () => {
    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.user).toBeNull();
  });

  it('setTokens 更新 accessToken 和 refreshToken', () => {
    useAuthStore.getState().setTokens('access-1', 'refresh-1');
    expect(useAuthStore.getState().accessToken).toBe('access-1');
    expect(useAuthStore.getState().refreshToken).toBe('refresh-1');
  });

  it('setUser 更新用户信息', () => {
    const user = { id: '1', email: 'a@b.com', name: 'Alice' };
    useAuthStore.getState().setUser(user);
    expect(useAuthStore.getState().user).toEqual(user);
  });

  it('reset 清空所有状态', () => {
    useAuthStore.getState().setTokens('a', 'b');
    useAuthStore.getState().setUser({ id: '1', email: 'a@b.com', name: 'Alice' });
    useAuthStore.getState().reset();
    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.user).toBeNull();
  });

  it('isAuthenticated 根据 accessToken 判断', () => {
    expect(useAuthStore.getState().isAuthenticated()).toBe(false);
    useAuthStore.getState().setTokens('a', 'b');
    expect(useAuthStore.getState().isAuthenticated()).toBe(true);
  });
});
