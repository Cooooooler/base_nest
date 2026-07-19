'use client';

import type { ChatChunk } from '@/api/chat';
import { streamChat } from '@/api/chat';
import type { ChatMessage } from '@/components/chat/types';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

interface UseChatStreamOptions {
  appId: string;
  convId: string;
  onComplete?: (lastChunk: ChatChunk | null) => void;
}

interface UseChatStreamReturn {
  messages: ChatMessage[];
  sending: boolean;
  streamingMsgIdx: number | null;
  streamingRef: { current: boolean };
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  sendMessage: (content: string, aiIdx?: number) => Promise<void>;
}

export function useChatStream({
  appId,
  convId,
  onComplete,
}: UseChatStreamOptions): UseChatStreamReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [streamingMsgIdx, setStreamingMsgIdx] = useState<number | null>(null);
  const streamingRef = useRef(false);
  const msgIdCounter = useRef(0);

  const sendMessage = useCallback(
    async (content: string, aiIdx?: number) => {
      if (!content.trim() || sending) return;

      setSending(true);
      streamingRef.current = true;
      const idx = aiIdx ?? messages.length + 1;
      setStreamingMsgIdx(idx);
      setMessages((prev) => [
        ...prev,
        { id: `msg_${msgIdCounter.current++}`, role: 'user', content },
        { id: `msg_${msgIdCounter.current++}`, role: 'assistant', content: '' },
      ]);

      let fullContent = '';
      let fullReasoning = '';
      let lastChunk: ChatChunk | null = null;
      try {
        for await (const chunk of streamChat(appId, convId, content)) {
          lastChunk = chunk;
          if (chunk.error) {
            toast.error(chunk.error);
            break;
          }
          fullContent += chunk.content || '';
          fullReasoning += chunk.reasoning || '';
          if (chunk.isEnd) {
            setMessages((prev) => {
              const next = [...prev];
              if (next[idx]) {
                next[idx] = {
                  role: 'assistant',
                  content: fullContent || '（模型未返回内容）',
                  reasoning: fullReasoning || undefined,
                };
              }
              return next;
            });
            break;
          }
          setMessages((prev) => {
            const next = [...prev];
            if (next[idx]) {
              next[idx] = {
                role: 'assistant',
                content: fullContent,
                reasoning: fullReasoning || undefined,
              };
            }
            return next;
          });
        }
      } catch {
        toast.error('发送失败');
      }

      // 流结束——将 sources 附加到最后一条消息
      if (lastChunk?.sources) {
        setMessages((prev) => {
          const next = [...prev];
          if (next[idx]) next[idx] = { ...next[idx], sources: lastChunk!.sources };
          return next;
        });
      }

      streamingRef.current = false;
      setStreamingMsgIdx(null);
      setSending(false);
      onComplete?.(lastChunk);
    },
    [appId, convId, sending, messages.length, onComplete]
  );

  return {
    messages,
    sending,
    streamingMsgIdx,
    streamingRef,
    setMessages,
    sendMessage,
  };
}
