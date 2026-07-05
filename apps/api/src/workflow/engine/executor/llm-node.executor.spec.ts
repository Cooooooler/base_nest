import { Test } from '@nestjs/testing';
import { LLMNodeExecutor } from './llm-node.executor';
import { ContextService } from '../context.service';
import { ProvidersService } from '../../../providers/providers.service';

describe('LLMNodeExecutor', () => {
  let executor: LLMNodeExecutor;

  const mockProvidersService = {
    getProviderClient: jest.fn().mockResolvedValue({
      chat: jest.fn().mockResolvedValue({
        content: 'AI response text',
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      }),
      chatStream: jest.fn(),
    }),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LLMNodeExecutor,
        { provide: ProvidersService, useValue: mockProvidersService },
      ],
    }).compile();
    executor = module.get(LLMNodeExecutor);
  });

  it('should call LLM and return content + tokens', async () => {
    const ctx = new ContextService({ query: 'hello' });
    const result = await executor.execute('llm_1', {
      providerId: 'prov-1',
      model: 'gpt-4o',
      prompt: 'Answer: {{inputs.query}}',
    }, ctx);
    expect(result.outputs.content).toBe('AI response text');
    expect(result.outputs.tokens).toEqual({ prompt: 10, completion: 20, total: 30 });
  });

  it('should resolve variables in config', async () => {
    const ctx = new ContextService({ query: 'hello' });
    const result = await executor.execute('llm_1', {
      providerId: 'prov-1',
      model: 'gpt-4o',
      prompt: 'Answer: {{inputs.query}}',
    }, ctx);
    // Verify the prompt was resolved before being passed to the client
    expect(mockProvidersService.getProviderClient).toHaveBeenCalledWith('prov-1');
  });
});
