import { ContextService } from '../context.service';
import { HttpRequestNodeExecutor } from './http-request-node.executor';

describe('HttpRequestNodeExecutor', () => {
  let executor: HttpRequestNodeExecutor;

  beforeAll(() => {
    // Mock global fetch to avoid real network requests
    jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation((url: string | URL | Request, init?: RequestInit) => {
        const urlStr = url instanceof URL ? url.href : typeof url === 'string' ? url : '';
        const method = init?.method || 'GET';
        if (method === 'GET') {
          if (urlStr.includes('posts/1')) {
            return Promise.resolve({
              status: 200,
              statusText: 'OK',
              headers: new Map(
                Object.entries({ 'content-type': 'application/json; charset=utf-8' })
              ),
              ok: true,
              text: () => Promise.resolve(JSON.stringify({ id: 1, title: 'test post' })),
            } as Response);
          }
          if (urlStr.includes('non-json')) {
            return Promise.resolve({
              status: 200,
              statusText: 'OK',
              headers: new Map(Object.entries({ 'content-type': 'text/plain' })),
              ok: true,
              text: () => Promise.resolve('plain text response'),
            } as Response);
          }
          return Promise.resolve({
            status: 200,
            statusText: 'OK',
            headers: new Map(Object.entries({ 'content-type': 'application/json; charset=utf-8' })),
            ok: true,
            text: () => Promise.resolve(JSON.stringify({ id: 1, title: 'delectus aut autem' })),
          } as Response);
        }
        if (method === 'POST') {
          return Promise.resolve({
            status: 201,
            statusText: 'Created',
            headers: new Map(Object.entries({ 'content-type': 'application/json; charset=utf-8' })),
            ok: true,
            text: () => Promise.resolve(JSON.stringify({ id: 101, title: 'foo' })),
          } as Response);
        }
        return Promise.reject(new Error(`Unhandled ${method} request to ${urlStr}`));
      });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    executor = new HttpRequestNodeExecutor();
  });

  it('should make GET request and return response', async () => {
    const ctx = new ContextService({});
    const result = await executor.execute(
      'http_1',
      {
        url: 'https://jsonplaceholder.typicode.com/todos/1',
        method: 'GET',
      },
      ctx
    );
    expect(result.outputs.status).toBe(200);
    expect(result.outputs.data).toBeDefined();
    expect(result.outputs.data.id).toBe(1);
    expect(result.outputs.data.title).toBeDefined();
  });

  it('should return status text and headers', async () => {
    const ctx = new ContextService({});
    const result = await executor.execute(
      'http_1',
      {
        url: 'https://jsonplaceholder.typicode.com/todos/1',
        method: 'GET',
      },
      ctx
    );
    expect(result.outputs.statusText).toBe('OK');
    expect(result.outputs.headers).toBeDefined();
    expect(typeof result.outputs.headers['content-type']).toBe('string');
  });

  it('should work with POST method', async () => {
    const ctx = new ContextService({});
    const result = await executor.execute(
      'http_1',
      {
        url: 'https://jsonplaceholder.typicode.com/posts',
        method: 'POST',
        body: { title: 'foo', body: 'bar', userId: 1 },
      },
      ctx
    );
    expect(result.outputs.status).toBe(201);
    expect(result.outputs.data.id).toBeDefined();
  });

  it('should resolve template variables in config', async () => {
    const ctx = new ContextService({ baseUrl: 'https://jsonplaceholder.typicode.com' });
    const result = await executor.execute(
      'http_1',
      {
        url: '{{inputs.baseUrl}}/todos/1',
        method: 'GET',
      },
      ctx
    );
    expect(result.outputs.status).toBe(200);
    expect(result.outputs.data.id).toBe(1);
  });

  it('should handle non-JSON response', async () => {
    const ctx = new ContextService({});
    const result = await executor.execute(
      'http_1',
      {
        url: 'https://jsonplaceholder.typicode.com/non-json',
        method: 'GET',
        headers: { Accept: 'text/plain' },
      },
      ctx
    );
    expect(result.outputs.status).toBe(200);
    expect(result.outputs.data).toBe('plain text response');
  });
});
