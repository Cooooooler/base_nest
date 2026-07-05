import { ContextService } from './context.service';

describe('ContextService', () => {
  it('should store and retrieve inputs', () => {
    const ctx = new ContextService({ query: 'hello' });
    expect(ctx.resolve('{{inputs.query}}')).toBe('hello');
  });

  it('should store node outputs and resolve references', () => {
    const ctx = new ContextService({});
    ctx.setNodeOutput('start', { result: 'output-value' });
    expect(ctx.resolve('{{nodes.start.output}}')).toBe('output-value');
  });

  it('should resolve nested object configs', () => {
    const ctx = new ContextService({ name: 'world' });
    const resolved = ctx.resolveConfig({
      prompt: 'Hello {{inputs.name}}',
      settings: { temperature: 0.7, greeting: 'Hi {{inputs.name}}' },
    });
    expect(resolved).toEqual({
      prompt: 'Hello world',
      settings: { temperature: 0.7, greeting: 'Hi world' },
    });
  });

  it('should keep unresolved variables as-is', () => {
    const ctx = new ContextService({});
    expect(ctx.resolve('{{missing.var}}')).toBe('{{missing.var}}');
  });

  it('should resolve tokens from llm output', () => {
    const ctx = new ContextService({});
    ctx.setNodeOutput('llm_1', { content: 'hello', tokens: { total: 150 } });
    expect(ctx.resolve('{{nodes.llm_1.tokens.total}}')).toBe('150');
  });

  it('should create a snapshot of current state', () => {
    const ctx = new ContextService({ x: '1' });
    const snap = ctx.snapshot();
    expect(snap.get('inputs.x')).toBe('1');
  });
});
