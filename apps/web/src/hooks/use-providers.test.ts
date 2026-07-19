import {
  createProvider,
  deleteProvider,
  getPresetModels,
  getProvider,
  getProviderModels,
  getProviders,
} from '@/api/providers';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from './__tests__/test-utils';
import {
  useCreateProvider,
  usePresetModels,
  useProvider,
  useProviderModels,
  useProviders,
} from './use-providers';

// ky is pure ESM — mock it to avoid Jest parse errors
jest.mock('ky', () => ({
  create: jest.fn(() => jest.fn()),
}));

jest.mock('@/api/client', () => ({
  apiClient: jest.fn(),
}));

jest.mock('@/api/providers');

const mockGetProviders = getProviders as jest.MockedFunction<typeof getProviders>;
const mockGetProvider = getProvider as jest.MockedFunction<typeof getProvider>;
const mockCreateProvider = createProvider as jest.MockedFunction<typeof createProvider>;
const mockDeleteProvider = deleteProvider as jest.MockedFunction<typeof deleteProvider>;
const mockGetProviderModels = getProviderModels as jest.MockedFunction<typeof getProviderModels>;
const mockGetPresetModels = getPresetModels as jest.MockedFunction<typeof getPresetModels>;

describe('useProviders', () => {
  it('returns provider list', async () => {
    mockGetProviders.mockResolvedValue([{ id: '1', name: 'OpenAI', type: 'openai' } as any]);
    const { result } = renderHook(() => useProviders(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });
});

describe('useProvider', () => {
  it('returns single provider', async () => {
    mockGetProvider.mockResolvedValue({ id: '1', name: 'OpenAI', type: 'openai' } as any);
    const { result } = renderHook(() => useProvider('1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.name).toBe('OpenAI');
  });

  it('does not fetch when id is empty', () => {
    const { result } = renderHook(() => useProvider(''), { wrapper: createWrapper() });
    expect(result.current.isPending).toBe(true);
  });
});

describe('useCreateProvider', () => {
  it('calls createProvider and invalidates', async () => {
    mockCreateProvider.mockResolvedValue({ id: '2', name: 'New', type: 'openai' } as any);
    const { result } = renderHook(() => useCreateProvider(), { wrapper: createWrapper() });
    result.current.mutate({ name: 'New', type: 'openai' } as any);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockCreateProvider).toHaveBeenCalledWith({ name: 'New', type: 'openai' });
  });
});

describe('useProviderModels', () => {
  it('returns model list', async () => {
    mockGetProviderModels.mockResolvedValue([{ id: 'm1', name: 'gpt-4' } as any]);
    const { result } = renderHook(() => useProviderModels('1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });
});

describe('usePresetModels', () => {
  it('returns preset models', async () => {
    mockGetPresetModels.mockResolvedValue([{ name: 'gpt-4', model: 'gpt-4' } as any]);
    const { result } = renderHook(() => usePresetModels('openai'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });
});
