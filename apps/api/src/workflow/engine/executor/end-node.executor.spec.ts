import { EndNodeExecutor } from './end-node.executor';
import { ContextService } from '../context.service';

describe('EndNodeExecutor', () => {
  let executor: EndNodeExecutor;

  beforeEach(() => {
    executor = new EndNodeExecutor();
  });

  it('should resolve output from context', async () => {
    const ctx = new ContextService({});
    ctx.setNodeOutput('llm_1', { content: 'hello world' });
    const result = await executor.execute('end', { output: '{{nodes.llm_1.output.content}}' }, ctx);
    expect(result.outputs).toEqual({ result: 'hello world' });
  });

  it('should pass through literal output', async () => {
    const ctx = new ContextService({});
    const result = await executor.execute('end', { output: 'static value' }, ctx);
    expect(result.outputs).toEqual({ result: 'static value' });
  });
});
