import { CodeNodeExecutor } from './code-node.executor';
import { ContextService } from '../context.service';

describe('CodeNodeExecutor', () => {
  let executor: CodeNodeExecutor;

  beforeEach(() => {
    executor = new CodeNodeExecutor();
  });

  it('should execute JS code and return result', async () => {
    const ctx = new ContextService({ x: 10, y: 20 });
    const result = await executor.execute('code_1', {
      code: 'return Number(inputs.x) + Number(inputs.y);',
      inputs: { x: '{{inputs.x}}', y: '{{inputs.y}}' },
    }, ctx);
    expect(result.outputs.result).toBe(30);
  });

  it('should capture console logs', async () => {
    const ctx = new ContextService({});
    const result = await executor.execute('code_1', {
      code: 'console.log("hello world"); return 42;',
      inputs: {},
    }, ctx);
    expect(result.outputs.result).toBe(42);
    expect(result.outputs.logs).toEqual(['hello world']);
  });

  it('should handle string concatenation', async () => {
    const ctx = new ContextService({ name: 'World' });
    const result = await executor.execute('code_1', {
      code: 'return `Hello, ${inputs.name}!`;',
      inputs: { name: '{{inputs.name}}' },
    }, ctx);
    expect(result.outputs.result).toBe('Hello, World!');
  });

  it('should handle async code', async () => {
    const ctx = new ContextService({});
    const result = await executor.execute('code_1', {
      code: 'return Promise.resolve(42);',
      inputs: {},
    }, ctx);
    const resolved = await result.outputs.result;
    expect(resolved).toBe(42);
  });
});
