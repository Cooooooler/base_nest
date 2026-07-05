import { ConditionNodeExecutor } from './condition-node.executor';
import { ContextService } from '../context.service';

describe('ConditionNodeExecutor', () => {
  let executor: ConditionNodeExecutor;

  beforeEach(() => {
    executor = new ConditionNodeExecutor();
  });

  it('should evaluate true expression', async () => {
    const ctx = new ContextService({});
    ctx.setNodeOutput('llm_1', { tokens: { total: 150 } });
    const result = await executor.execute('cond_1', {
      expression: '{{nodes.llm_1.tokens.total}} > 100',
    }, ctx);
    expect(result.outputs.result).toBe(true);
  });

  it('should evaluate false expression', async () => {
    const ctx = new ContextService({});
    const result = await executor.execute('cond_1', {
      expression: '1 > 2',
    }, ctx);
    expect(result.outputs.result).toBe(false);
  });

  it('should handle malformed expression gracefully', async () => {
    const ctx = new ContextService({});
    const result = await executor.execute('cond_1', {
      expression: 'invalid {{{ syntax',
    }, ctx);
    expect(result.outputs.result).toBe(false);
  });
});
