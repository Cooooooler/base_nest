'use client';

import { streamChat } from '@/api/chat';
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
import { MessageSquare, Plus, Send, Trash2 } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const { id: appId } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: app, isLoading: appLoading } = useApp(appId);

  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const { data: conversations, refetch: refetchConvs } = useConversations(appId);
  const { data: loadedMessages, refetch: refetchMsgs } = useMessages(appId, activeConvId || '');

  const createConv = useCreateConversation();
  const deleteConv = useDeleteConversation();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load messages when conversation changes
  useEffect(() => {
    if (loadedMessages) {
      setMessages(
        loadedMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))
      );
    } else {
      setMessages([]);
    }
  }, [loadedMessages]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = useCallback(async () => {
    const content = input.trim();
    if (!content || sending) return;

    let convId = activeConvId;
    if (!convId) {
      try {
        const conv = await createConv.mutateAsync({ appId });
        convId = conv.id;
        setActiveConvId(convId);
        await refetchConvs();
      } catch {
        toast.error('创建会话失败');
        return;
      }
    }

    setSending(true);
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content }]);

    let fullContent = '';
    setStreamingContent('');
    try {
      for await (const chunk of streamChat(appId, convId, content)) {
        if (chunk.error) {
          toast.error(chunk.error);
          break;
        }
        if (chunk.isEnd) break;
        fullContent += chunk.content;
        setStreamingContent(fullContent);
      }
    } catch {
      toast.error('发送失败');
    }

    setMessages((prev) => [...prev, { role: 'assistant', content: fullContent }]);
    setStreamingContent('');
    setSending(false);
    await refetchMsgs();
  }, [appId, input, sending, activeConvId, createConv, refetchConvs, refetchMsgs]);

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
          <Button className='cursor-pointer w-full' size='sm' onClick={handleNewConversation}>
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
                  className='cursor-pointer size-6 shrink-0'
                  variant='ghost'
                  size='icon'
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConv(conv.id);
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
        <CardContent className='flex flex-1 flex-col p-0'>
          {/* Messages */}
          <div className='flex-1 overflow-y-auto p-4'>
            {messages.length === 0 && !streamingContent ? (
              <div className='flex h-full flex-col items-center justify-center gap-3 text-muted-foreground'>
                <MessageSquare className='size-12' />
                <p>开始与 {app.name} 对话</p>
              </div>
            ) : (
              <div className='flex flex-col gap-4'>
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <div className='prose prose-sm dark:prose-invert max-w-none'>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className='whitespace-pre-wrap text-sm'>{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}

                {streamingContent && (
                  <div className='flex justify-start'>
                    <div className='max-w-[80%] rounded-lg bg-muted px-4 py-2'>
                      <div className='prose prose-sm dark:prose-invert max-w-none'>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {streamingContent}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
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
                className='cursor-pointer self-end'
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
