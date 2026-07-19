import { renderHook, act, waitFor } from '@testing-library/react';import { useChatStream } from './use-chat-stream';

// mock streamChat
jest.mock('@/api/chat', () => ({
  streamChat: jest.fn(),
}));

import { streamChat } from '@/api/chat';

const mockStreamChat = streamChat as jest.MockedFunction<typeof streamChat>;

async function* makeStream(
  chunks: Array<{
    content?: string;
    isEnd?: boolean;
    reasoning?: string;
    error?: string;
  }>
) {
  for (const chunk of chunks) {
    yield chunk;
    await Promise.resolve();
  }
}

describe('useChatStream', () => {
  const defaultOpts = { appId: 'app-1', convId: 'conv-1' };

  beforeEach(() => {
    mockStreamChat.mockReset();
  });

  it('appends user and assistant messages after send', async () => {
    mockStreamChat.mockReturnValue(makeStream([{ content: 'Hello', isEnd: true }]));

    const { result } = renderHook(() => useChatStream(defaultOpts));

    await act(async () => {
      await result.current.sendMessage('Hi');
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].role).toBe('user');
    expect(result.current.messages[0].content).toBe('Hi');
    expect(result.current.messages[1].role).toBe('assistant');
  });

  it('streams and concatenates AI response content', async () => {
    mockStreamChat.mockReturnValue(
      makeStream([
        { content: 'Hel', isEnd: false },
        { content: 'lo', isEnd: false },
        { content: ' World', isEnd: true },
      ])
    );

    const { result } = renderHook(() => useChatStream(defaultOpts));

    await act(async () => {
      await result.current.sendMessage('Test');
    });

    expect(result.current.messages[1].content).toBe('Hello World');
  });

  it('handles error chunk and stops streaming', async () => {
    mockStreamChat.mockReturnValue(makeStream([{ error: 'API Error', isEnd: true }]));

    const { result } = renderHook(() => useChatStream(defaultOpts));

    await act(async () => {
      await result.current.sendMessage('Hi');
    });

    expect(result.current.messages[1].content).toBe('');
  });

  it('sets sending to true during transmission', async () => {
    // Use a delayed stream so intermediate state is observable
    async function* delayedStream() {
      await new Promise((resolve) => setTimeout(resolve, 50));
      yield { content: 'ok', isEnd: true };
    }
    mockStreamChat.mockReturnValue(delayedStream());

    const { result } = renderHook(() => useChatStream(defaultOpts));

    let sendPromise: Promise<void>;
    await act(async () => {
      sendPromise = result.current.sendMessage('Hi');
    });

    await waitFor(() => expect(result.current.sending).toBe(true));

    await waitFor(() => expect(result.current.sending).toBe(false));
  });
});
