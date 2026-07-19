import { ProvidersService } from '../../../providers/providers.service';
import { ContextService } from '../context.service';
import { QuestionClassifierNodeExecutor } from './question-classifier-node.executor';

describe('QuestionClassifierNodeExecutor', () => {
  let executor: QuestionClassifierNodeExecutor;
  let mockProvidersService: jest.Mocked<ProvidersService>;
  const mockChatFn = jest.fn().mockResolvedValue({
    content: 'tech_support',
    usage: { promptTokens: 10, completionTokens: 2, totalTokens: 12 },
  });

  beforeEach(() => {
    mockChatFn.mockClear();
    mockProvidersService = {
      getProviderClient: jest.fn().mockResolvedValue({
        chat: mockChatFn,
      }),
    } as any;

    executor = new QuestionClassifierNodeExecutor(mockProvidersService);
  });

  it('should classify input into a category', async () => {
    const ctx = new ContextService({});
    const result = await executor.execute(
      'qc_1',
      {
        providerId: 'prov-1',
        model: 'gpt-4o',
        instruction: 'Classify the user question',
        categories: [
          { id: 'tech_support', name: 'Technical Support', description: 'Tech issues' },
          { id: 'billing', name: 'Billing', description: 'Payment issues' },
        ],
        input: 'My payment is not working',
      },
      ctx
    );

    expect(result.outputs.category).toBe('tech_support');
    expect(mockProvidersService.getProviderClient).toHaveBeenCalledWith('prov-1');
  });

  it('should handle missing category descriptions', async () => {
    const ctx = new ContextService({});
    const result = await executor.execute(
      'qc_1',
      {
        providerId: 'prov-1',
        model: 'gpt-4o',
        instruction: 'Classify',
        categories: [{ id: 'general', name: 'General' }],
        input: 'Hello',
      },
      ctx
    );

    expect(result.outputs.category).toBe('tech_support');
  });
});
