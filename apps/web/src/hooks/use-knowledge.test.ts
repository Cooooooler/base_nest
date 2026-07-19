import { renderHook, waitFor } from '@testing-library/react';
import {
  useKnowledgeBases,
  useKnowledgeBase,
  useDocuments,
  useDocumentSegments,
} from './use-knowledge';
import {
  getKnowledgeBases,
  getKnowledgeBase,
  getDocuments,
  getDocumentSegments,
} from '@/api/knowledge';
import { createWrapper } from './__tests__/test-utils';

// ky is pure ESM — mock it to avoid Jest parse errors
jest.mock('ky', () => ({
  create: jest.fn(() => jest.fn()),
}));

jest.mock('@/api/client', () => ({
  apiClient: jest.fn(),
}));

jest.mock('@/api/knowledge');

const mockGetKnowledgeBases = getKnowledgeBases as jest.MockedFunction<
  typeof getKnowledgeBases
>;
const mockGetKnowledgeBase = getKnowledgeBase as jest.MockedFunction<
  typeof getKnowledgeBase
>;
const mockGetDocuments = getDocuments as jest.MockedFunction<typeof getDocuments>;
const mockGetDocumentSegments = getDocumentSegments as jest.MockedFunction<
  typeof getDocumentSegments
>;

describe('useKnowledgeBases', () => {
  it('returns KB list', async () => {
    mockGetKnowledgeBases.mockResolvedValue([{ id: '1', name: 'Docs' } as any]);
    const { result } = renderHook(() => useKnowledgeBases(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });
});

describe('useDocuments', () => {
  it('returns document list', async () => {
    mockGetDocuments.mockResolvedValue([{ id: 'd1', fileName: 'doc.pdf' } as any]);
    const { result } = renderHook(() => useDocuments('1'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });
});
