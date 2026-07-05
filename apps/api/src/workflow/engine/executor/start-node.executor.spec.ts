import { StartNodeExecutor } from './start-node.executor';
import { ContextService } from '../context.service';

describe('StartNodeExecutor', () => {
  let executor: StartNodeExecutor;

  beforeEach(() => {
    executor = new StartNodeExecutor();
  });

  it('should return inputs as outputs', async () => {
    const ctx = new ContextService({ query: 'hello', userId: '123' });
    const result = await executor.execute('start', {}, ctx);
    expect(result.outputs).toEqual({ query: 'hello', userId: '123' });
  });

  it('should return empty object when no inputs', async () => {
    const ctx = new ContextService({});
    const result = await executor.execute('start', {}, ctx);
    expect(result.outputs).toEqual({});
  });
});
