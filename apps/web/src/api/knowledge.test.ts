import { apiClient } from './client';
import {
  createKnowledgeBase,
  deleteDocument,
  deleteKnowledgeBase,
  getDocument,
  getDocuments,
  getDocumentSegments,
  getKnowledgeBase,
  getKnowledgeBases,
  retrieve,
} from './knowledge';

// ky 是纯 ESM 模块，mock 它以避免 Jest 解析错误
jest.mock('ky', () => ({
  create: jest.fn(() => jest.fn()),
}));

jest.mock('./client', () => ({
  apiClient: jest.fn(),
  ApiError: jest.requireActual('./client').ApiError,
}));

const mockApiClient = apiClient as jest.MockedFunction<typeof apiClient>;

describe('knowledge API', () => {
  beforeEach(() => {
    mockApiClient.mockReset();
  });

  it('getKnowledgeBases', async () => {
    mockApiClient.mockResolvedValue([]);
    await getKnowledgeBases();
    expect(mockApiClient).toHaveBeenCalledWith('/knowledge');
  });

  it('getKnowledgeBase', async () => {
    mockApiClient.mockResolvedValue({ id: '1', name: 'Docs' });
    await getKnowledgeBase('1');
    expect(mockApiClient).toHaveBeenCalledWith('/knowledge/1');
  });

  it('createKnowledgeBase', async () => {
    mockApiClient.mockResolvedValue({ id: '2', name: 'New KB' });
    const dto = { name: 'New KB', chunkSize: 1000, chunkOverlap: 200 };
    await createKnowledgeBase(dto);
    expect(mockApiClient).toHaveBeenCalledWith('/knowledge', { method: 'POST', json: dto });
  });

  it('deleteKnowledgeBase', async () => {
    mockApiClient.mockResolvedValue(undefined);
    await deleteKnowledgeBase('1');
    expect(mockApiClient).toHaveBeenCalledWith('/knowledge/1', { method: 'DELETE' });
  });

  it('getDocuments', async () => {
    mockApiClient.mockResolvedValue([]);
    await getDocuments('1');
    expect(mockApiClient).toHaveBeenCalledWith('/knowledge/1/documents');
  });

  it('getDocument', async () => {
    mockApiClient.mockResolvedValue({ id: 'd1', fileName: 'doc.pdf' });
    await getDocument('1', 'd1');
    expect(mockApiClient).toHaveBeenCalledWith('/knowledge/1/documents/d1');
  });

  it('deleteDocument', async () => {
    mockApiClient.mockResolvedValue(undefined);
    await deleteDocument('1', 'd1');
    expect(mockApiClient).toHaveBeenCalledWith('/knowledge/1/documents/d1', { method: 'DELETE' });
  });

  it('getDocumentSegments', async () => {
    mockApiClient.mockResolvedValue([]);
    await getDocumentSegments('1', 'd1');
    expect(mockApiClient).toHaveBeenCalledWith('/knowledge/1/documents/d1/segments');
  });

  it('retrieve', async () => {
    mockApiClient.mockResolvedValue([]);
    await retrieve('1', 'hello', 5);
    expect(mockApiClient).toHaveBeenCalledWith('/knowledge/1/retrieval', {
      method: 'POST',
      json: { query: 'hello', topK: 5 },
    });
  });
});
