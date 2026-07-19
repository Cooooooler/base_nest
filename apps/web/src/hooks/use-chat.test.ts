import { renderHook, waitFor } from '@testing-library/react';
import { useApps, useApp, useConversations, useMessages } from './use-chat';
import { getApps, getApp, getConversations, getMessages } from '@/api/chat';
import { createWrapper } from './__tests__/test-utils';

// ky is pure ESM — mock it to avoid Jest parse errors
jest.mock('ky', () => ({
  create: jest.fn(() => jest.fn()),
}));

jest.mock('@/api/client', () => ({
  apiClient: jest.fn(),
}));

jest.mock('@/api/chat');

const mockGetApps = getApps as jest.MockedFunction<typeof getApps>;
const mockGetApp = getApp as jest.MockedFunction<typeof getApp>;
const mockGetConversations = getConversations as jest.MockedFunction<
  typeof getConversations
>;
const mockGetMessages = getMessages as jest.MockedFunction<typeof getMessages>;

describe('useApps', () => {
  it('returns app list', async () => {
    mockGetApps.mockResolvedValue([{ id: '1', name: 'Chat App' } as any]);
    const { result } = renderHook(() => useApps(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });
});

describe('useConversations', () => {
  it('returns conversation list', async () => {
    mockGetConversations.mockResolvedValue([{ id: 'c1', title: 'Chat' } as any]);
    const { result } = renderHook(() => useConversations('app-1'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });
});
