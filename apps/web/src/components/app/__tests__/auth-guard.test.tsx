import { useAuthStore } from '@/store/auth-store';
import { render, screen } from '@testing-library/react';
import { AuthGuard } from '../auth-guard';

// Mock next/navigation
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  usePathname: () => '/dashboard',
}));

// Mock ahooks useMount — use real useEffect so callback runs after render, not during
jest.mock('ahooks', () => ({
  useMount: (fn: () => void) => {
    const { useEffect } = jest.requireActual('react');
    useEffect(fn, []);
  },
}));

beforeEach(() => {
  mockReplace.mockClear();
  useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
  // 模拟 persist 已 hydrate
  (useAuthStore as any).persist = { hasHydrated: () => true };
});

describe('AuthGuard', () => {
  it('redirects to /login when not authenticated', () => {
    render(
      <AuthGuard>
        <div>protected</div>
      </AuthGuard>
    );
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('renders children when authenticated', () => {
    useAuthStore.getState().setTokens('a', 'b');
    render(
      <AuthGuard>
        <div>protected</div>
      </AuthGuard>
    );
    expect(screen.getByText('protected')).toBeInTheDocument();
  });

  it('renders nothing before hydration completes', () => {
    (useAuthStore as any).persist = { hasHydrated: () => false, onFinishHydration: jest.fn() };
    const { container } = render(
      <AuthGuard>
        <div>protected</div>
      </AuthGuard>
    );
    expect(container).toBeEmptyDOMElement();
  });
});
