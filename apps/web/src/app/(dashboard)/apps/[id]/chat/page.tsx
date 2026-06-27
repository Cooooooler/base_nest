'use client';

import { streamChat, type ChatChunk } from '@/api/chat';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  useApp,
  useConversations,
  useCreateConversation,
  useDeleteConversation,
  useMessages,
} from '@/hooks/use-chat';
import { useUpdateEffect } from 'ahooks';
import { FileText, MessageSquare, Plus, Send, Trash2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{
    content: string;
    metadata: Record<string, any>;
    score?: number;
  }>;
}

export default function ChatPage() {
  const { id: appId } = useParams<{ id: string }>();
  const { data: app, isLoading: appLoading } = useApp(appId);

  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const { data: conversations, refetch: refetchConvs } = useConversations(appId);
  const { data: loadedMessages } = useMessages(appId, activeConvId || '');

  const createConv = useCreateConversation();
  const deleteConv = useDeleteConversation();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 防止 React Query 请求在流式对话中覆盖本地消息
  const streamingRef = useRef(false);
  // 跟踪本地 messages 对应哪个会话
  const localConvIdRef = useRef<string | null>(null);

  // Sync loadedMessages → local messages when conversation changes

  useEffect(() => {
    if (streamingRef.current) return;

    if (!activeConvId) {
      setMessages([]);
      localConvIdRef.current = null;
      return;
    }

    const convChanged = activeConvId !== localConvIdRef.current;
    const dataArrived =
      loadedMessages && localConvIdRef.current === activeConvId && messages.length === 0;

    if (convChanged || dataArrived) {
      if (loadedMessages) {
        setMessages(
          loadedMessages.map((m) => {
            const msg: ChatMessage = {
              role: m.role as 'user' | 'assistant',
              content: m.content,
            };
            if (m.metadata?.sources) {
              msg.sources = m.metadata.sources;
            }
            return msg;
          })
        );
      } else {
        setMessages([]);
      }
      localConvIdRef.current = activeConvId;
    }
  }, [activeConvId, loadedMessages, messages.length]);

  // Auto scroll — skip the initial render (messages starts empty anyway)
  useUpdateEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) return;

    let convId = activeConvId;
    if (!convId) {
      try {
        const conv = await createConv.mutateAsync({ appId });
        convId = conv.id;
        setActiveConvId(convId);
        localConvIdRef.current = convId;
        await refetchConvs();
      } catch {
        toast.error('创建会话失败');
        return;
      }
    }

    setSending(true);
    setInput('');
    streamingRef.current = true;
    const aiIdx = messages.length + 1;
    setMessages((prev) => [...prev, { role: 'user', content }, { role: 'assistant', content: '' }]);

    let fullContent = '';
    let lastChunk: ChatChunk | null = null;
    try {
      for await (const chunk of streamChat(appId, convId, content)) {
        lastChunk = chunk;
        if (chunk.error) {
          toast.error(chunk.error);
          break;
        }
        if (chunk.isEnd) break;
        fullContent += chunk.content;
        setMessages((prev) => {
          const next = [...prev];
          if (next[aiIdx]) next[aiIdx] = { role: 'assistant', content: fullContent };
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
        if (next[aiIdx]) next[aiIdx] = { ...next[aiIdx], sources: lastChunk!.sources };
        return next;
      });
    }

    streamingRef.current = false;
    setSending(false);
  };

  const handleNewConversation = async () => {
    setActiveConvId(null);
    setMessages([]);
  };

  const handleDeleteConv = async (convId: string) => {
    try {
      await deleteConv.mutateAsync({ appId, convId });
      if (activeConvId === convId) {
        setActiveConvId(null);
        setMessages([]);
      }
      await refetchConvs();
    } catch {
      toast.error('删除失败');
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      await handleSend();
    }
  };

  if (appLoading) {
    return (
      <div className='flex h-[calc(100vh-8rem)] gap-4'>
        <Skeleton className='w-64 shrink-0' />
        <Skeleton className='flex-1' />
      </div>
    );
  }

  if (!app) return <p className='text-muted-foreground'>应用未找到</p>;

  return (
    <div className='flex h-[calc(100vh-8rem)] gap-4'>
      {/* Conversation sidebar */}
      <Card className='flex w-64 shrink-0 flex-col'>
        <CardContent className='flex flex-col gap-2 p-3'>
          <Button className='w-full' size='sm' onClick={handleNewConversation}>
            <Plus data-icon />
            新会话
          </Button>
          <div className='flex flex-col gap-1'>
            {conversations?.map((conv) => (
              <div
                key={conv.id}
                className={`flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                  activeConvId === conv.id
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                }`}
                onClick={() => setActiveConvId(conv.id)}
              >
                <span className='truncate'>
                  {conv.title || `会话 ${conv.createdAt.slice(0, 10)}`}
                </span>
                <Button
                  className='size-6 shrink-0'
                  variant='ghost'
                  size='icon'
                  onClick={async (e) => {
                    e.stopPropagation();
                    await handleDeleteConv(conv.id);
                  }}
                >
                  <Trash2 className='size-3' />
                </Button>
              </div>
            ))}
            {(!conversations || conversations.length === 0) && (
              <p className='py-4 text-center text-xs text-muted-foreground'>暂无会话</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main chat area */}
      <Card className='flex flex-1 flex-col'>
        <CardContent className='flex flex-1 flex-col p-0 h-full'>
          {/* Messages */}
          <div className='flex-1 overflow-y-auto p-4 h-full'>
            {messages.length === 0 ? (
              <div className='flex h-full flex-col items-center justify-center gap-3 text-muted-foreground'>
                <MessageSquare className='size-12' />
                <p>开始与 {app.name} 对话</p>
              </div>
            ) : (
              <div className='flex flex-col gap-4'>
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${
                      msg.role === 'assistant' && !msg.content ? 'opacity-50' : ''
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        msg.content ? (
                          <>
                            <div className='prose prose-sm dark:prose-invert max-w-none'>
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                            {msg.sources && msg.sources.length > 0 && (
                              <SourceList data={msg.sources} />
                            )}
                          </>
                        ) : (
                          <div className='flex items-center gap-1.5 py-1'>
                            <span
                              className='size-1.5 animate-bounce rounded-full bg-current'
                              style={{ animationDelay: '0ms' }}
                            />
                            <span
                              className='size-1.5 animate-bounce rounded-full bg-current'
                              style={{ animationDelay: '150ms' }}
                            />
                            <span
                              className='size-1.5 animate-bounce rounded-full bg-current'
                              style={{ animationDelay: '300ms' }}
                            />
                          </div>
                        )
                      ) : (
                        <p className='whitespace-pre-wrap text-sm'>{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input area */}
          <div className='border-t p-4'>
            <div className='flex gap-2'>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='输入消息... (Enter 发送, Shift+Enter 换行)'
                rows={2}
                className='resize-none'
              />
              <Button
                className='self-end'
                size='icon'
                onClick={handleSend}
                disabled={sending || !input.trim()}
              >
                <Send className='size-4' />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SourceList({ data }: { data: NonNullable<ChatMessage['sources']> }) {
  const [open, setOpen] = useState(false);

  return (
    <div className='mt-3 border-t border-border/50 pt-2'>
      <button
        className='flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors'
        onClick={() => setOpen(!open)}
      >
        <FileText className='size-3' />
        <span>
          {open ? '收起' : '展开'}来源（{data.length}）
        </span>
      </button>
      {open && (
        <div className='mt-2 flex flex-col gap-1.5'>
          {data.map((src, i) => (
            <div
              key={i}
              className='flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-xs'
            >
              <span className='shrink-0 font-semibold text-muted-foreground'>[{i + 1}]</span>
              <span className='min-w-0 flex-1 truncate text-foreground'>
                {src.metadata?.fileName ? String(src.metadata.fileName) : '未知来源'}
              </span>
              {src.score !== undefined && (
                <span className='shrink-0 tabular-nums text-muted-foreground'>
                  {(src.score * 100).toFixed(0)}%
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
