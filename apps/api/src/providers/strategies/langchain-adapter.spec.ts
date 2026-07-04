import { fromPartial } from '@total-typescript/shoehorn';
import { LangChainAdapter } from './langchain-adapter';

const mockInstances: any[] = [];

function createMockChunk(content: string, kwargs: Record<string, any> = {}) {
  return { content, additional_kwargs: kwargs, response_metadata: {} };
}

function createModelFactory() {
  return (modelName: string) => {
    const m = {
      invoke: jest.fn().mockResolvedValue(createMockResponse(`Hello from ${modelName}!`)),
      stream: jest.fn().mockImplementation(function* () {
        yield createMockChunk('Hello ');
        yield createMockChunk(`from ${modelName}!`);
      }),
    };
    mockInstances.push(m);
    return m;
  };
}

function createMockResponse(content: string) {
  return { content, additional_kwargs: {}, response_metadata: {} };
}

const mockEmbeddings = fromPartial({
  embedDocuments: jest.fn().mockResolvedValue([
    [0.1, 0.2, 0.3],
    [0.4, 0.5, 0.6],
  ]),
  embedQuery: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
});

describe('LangChainAdapter', () => {
  let factory: ReturnType<typeof createModelFactory>;
  let adapter: LangChainAdapter;

  beforeEach(() => {
    mockInstances.length = 0;
    factory = createModelFactory();
    adapter = new LangChainAdapter(factory, mockEmbeddings);
  });

  // ---- chat() ----

  describe('chat()', () => {
    it('should invoke model with the correct model name from params', async () => {
      const result = await adapter.chat({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(result.content).toBe('Hello from gpt-4o!');
    });

    it('should pass LangChain messages to invoke()', async () => {
      await adapter.chat({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'Be helpful' },
          { role: 'user', content: 'Hi' },
        ],
      });

      expect(mockInstances[0].invoke).toHaveBeenCalledTimes(1);
    });

    it('should surface usage metadata if available', async () => {
      const usageFactory = () => ({
        ...createModelFactory()('x'),
        invoke: jest.fn().mockResolvedValue({
          content: 'Hello',
          additional_kwargs: {},
          response_metadata: {},
          usage_metadata: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
        }),
      });
      const adapterWithUsage = new LangChainAdapter(usageFactory, mockEmbeddings);

      const result = await adapterWithUsage.chat({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(result.usage).toBeDefined();
      expect(result.usage!.totalTokens).toBe(15);
    });
  });

  // ---- chatStream() ----

  describe('chatStream()', () => {
    it('should return an Observable that emits ChatChunks', (done) => {
      const chunks: any[] = [];

      adapter
        .chatStream({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'Hi' }],
        })
        .subscribe({
          next: (chunk) => chunks.push(chunk),
          error: done,
          complete: () => {
            expect(chunks.length).toBeGreaterThan(0);
            expect(chunks[0]).toHaveProperty('content');
            expect(chunks[0]).toHaveProperty('isEnd');
            done();
          },
        });
    });

    it('should accumulate content across chunks with correct model', (done) => {
      const chunks: any[] = [];

      adapter
        .chatStream({
          model: 'llama3',
          messages: [{ role: 'user', content: 'Hi' }],
        })
        .subscribe({
          next: (chunk) => chunks.push(chunk),
          error: done,
          complete: () => {
            const fullContent = chunks.map((c: any) => c.content).join('');
            expect(fullContent).toBe('Hello from llama3!');
            done();
          },
        });
    });

    it('should extract reasoning from additional_kwargs.thinking', (done) => {
      const thinkingFactory = () => ({
        ...createModelFactory()('x'),
        stream: jest.fn().mockImplementation(function* () {
          yield createMockChunk('', { thinking: 'I need to think about this...' });
          yield createMockChunk('Here is my answer.');
        }),
      });
      const adapter2 = new LangChainAdapter(thinkingFactory, mockEmbeddings);

      const chunks: any[] = [];
      adapter2
        .chatStream({
          model: 'deepseek-r1',
          messages: [{ role: 'user', content: 'Think hard' }],
        })
        .subscribe({
          next: (chunk) => chunks.push(chunk),
          error: done,
          complete: () => {
            const reasoningParts = chunks.map((c: any) => c.reasoning).filter(Boolean);
            expect(reasoningParts.length).toBeGreaterThan(0);
            expect(reasoningParts[0]).toContain('I need to think');
            done();
          },
        });
    });

    it('should extract reasoning from additional_kwargs.reasoning_content', (done) => {
      const rcFactory = () => ({
        ...createModelFactory()('x'),
        stream: jest.fn().mockImplementation(function* () {
          yield createMockChunk('', { reasoning_content: 'Reasoning step 1...' });
          yield createMockChunk('Answer');
        }),
      });
      const a = new LangChainAdapter(rcFactory, mockEmbeddings);

      const chunks: any[] = [];
      a.chatStream({
        model: 'qwen3.5',
        messages: [{ role: 'user', content: 'Hi' }],
      }).subscribe({
        next: (chunk) => chunks.push(chunk),
        error: done,
        complete: () => {
          expect(chunks.some((c: any) => c.reasoning)).toBe(true);
          done();
        },
      });
    });
  });

  // ---- embed() ----

  describe('embed()', () => {
    it('should delegate to embedDocuments', async () => {
      const result = await adapter.embed(['text1', 'text2']);

      expect(mockEmbeddings.embedDocuments).toHaveBeenCalledWith(['text1', 'text2']);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual([0.1, 0.2, 0.3]);
    });
  });
});
