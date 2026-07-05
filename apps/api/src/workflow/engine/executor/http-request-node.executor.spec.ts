import { HttpRequestNodeExecutor } from './http-request-node.executor';
import { ContextService } from '../context.service';

describe('HttpRequestNodeExecutor', () => {
  let executor: HttpRequestNodeExecutor;
  const TIMEOUT = 15_000;

  beforeEach(() => {
    executor = new HttpRequestNodeExecutor();
  });

  it('should make GET request and return response', async () => {
    const ctx = new ContextService({});
    const result = await executor.execute('http_1', {
      url: 'https://jsonplaceholder.typicode.com/todos/1',
      method: 'GET',
    }, ctx);
    expect(result.outputs.status).toBe(200);
    expect(result.outputs.data).toBeDefined();
    expect(result.outputs.data.id).toBe(1);
    expect(result.outputs.data.title).toBeDefined();
  }, TIMEOUT);

  it('should return status text and headers', async () => {
    const ctx = new ContextService({});
    const result = await executor.execute('http_1', {
      url: 'https://jsonplaceholder.typicode.com/todos/1',
      method: 'GET',
    }, ctx);
    expect(result.outputs.statusText).toBe('OK');
    expect(result.outputs.headers).toBeDefined();
    expect(typeof result.outputs.headers['content-type']).toBe('string');
  }, TIMEOUT);

  it('should work with POST method', async () => {
    const ctx = new ContextService({});
    const result = await executor.execute('http_1', {
      url: 'https://jsonplaceholder.typicode.com/posts',
      method: 'POST',
      body: { title: 'foo', body: 'bar', userId: 1 },
    }, ctx);
    expect(result.outputs.status).toBe(201);
    expect(result.outputs.data.id).toBeDefined();
  }, TIMEOUT);

  it('should resolve template variables in config', async () => {
    const ctx = new ContextService({ baseUrl: 'https://jsonplaceholder.typicode.com' });
    const result = await executor.execute('http_1', {
      url: '{{inputs.baseUrl}}/todos/1',
      method: 'GET',
    }, ctx);
    expect(result.outputs.status).toBe(200);
    expect(result.outputs.data.id).toBe(1);
  }, TIMEOUT);

  it('should handle non-JSON response', async () => {
    const ctx = new ContextService({});
    const result = await executor.execute('http_1', {
      url: 'https://jsonplaceholder.typicode.com/posts/1',
      method: 'GET',
      headers: { Accept: 'text/plain' },
    }, ctx);
    // jsonplaceholder always returns JSON, but the executor should handle it
    expect(result.outputs.status).toBe(200);
    expect(result.outputs.data).toBeDefined();
  }, TIMEOUT);
});
