'use client';

import { type ChatChunk, streamChat } from '@/api/chat';
import { FadeIn } from '@/components/animated/fade-in';
import {
  AssistantMessage,
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  MessageAnimated,
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerSentinel,
  MessageScrollerViewport,
} from '@/components/chat';
import type { ChatMessage } from '@/components/chat/types';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  useApp,
  useConversations,
  useCreateConversation,
  useDeleteConversation,
  useMessages,
} from '@/hooks/use-chat';
import { MessageSquare, MoreHorizontal, Plus, SendHorizontal, Trash2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

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
  const [streamingMsgIdx, setStreamingMsgIdx] = useState<number | null>(null);

  // 防止 React Query 请求在流式对话中覆盖本地消息
  const streamingRef = useRef(false);
  // 跟踪本地 messages 对应哪个会话
  const localConvIdRef = useRef<string | null>(null);
  // 本地消息 ID 计数器（唯一标识）
  const msgIdCounter = useRef(0);

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
              id: m.id,
              role: m.role as 'user' | 'assistant',
              content: m.content,
            };
            if (m.metadata?.sources) {
              msg.sources = m.metadata.sources;
            }
            if (m.metadata?.reasoning) {
              msg.reasoning = m.metadata.reasoning;
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

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) return;

    let convId = activeConvId;
    if (!convId) {
      try {
        const conv = await createConv.mutateAsync({ appId, title: content.slice(0, 255) });
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
    setStreamingMsgIdx(aiIdx);
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
            if (next[aiIdx]) {
              next[aiIdx] = {
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
          if (next[aiIdx]) {
            next[aiIdx] = {
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

    if (lastChunk?.sources) {
      setMessages((prev) => {
        const next = [...prev];
        if (next[aiIdx]) next[aiIdx] = { ...next[aiIdx], sources: lastChunk!.sources };
        return next;
      });
    }

    streamingRef.current = false;
    setStreamingMsgIdx(null);
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
      <FadeIn direction='up' className='flex flex-1 flex-col min-h-0'>
        <div className='flex flex-1 gap-4 min-h-0'>
          <Skeleton className='w-64 shrink-0' />
          <Skeleton className='flex-1' />
        </div>
      </FadeIn>
    );
  }

  if (!app)
    return (
      <FadeIn direction='up' className='flex-1'>
        <p className='text-muted-foreground'>应用未找到</p>
      </FadeIn>
    );

  const showMessages = messages.length > 0;

  return (
    <FadeIn direction='up' className='flex flex-1 flex-col min-h-0'>
      <div className='flex flex-1 gap-4 min-h-0'>
        {/* Conversation sidebar */}
        <Card
          size='sm'
          className='flex w-64 shrink-0 flex-col min-h-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg'
        >
          <CardHeader className='flex items-center justify-between'>
            <CardTitle>历史会话</CardTitle>
            <CardAction>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button size='icon-sm' variant='ghost' onClick={handleNewConversation}>
                      <Plus className='size-4' />
                    </Button>
                  }
                />
                <TooltipContent>新建会话</TooltipContent>
              </Tooltip>
            </CardAction>
          </CardHeader>
          <Separator />
          <CardContent className={'flex flex-col gap-1 px-3 pb-3 overflow-y-auto'}>
            {conversations?.map((conv) => (
              <div
                key={conv.id}
                className={`group flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                  activeConvId === conv.id
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                }`}
                onClick={() => setActiveConvId(conv.id)}
              >
                <span className='truncate'>
                  {conv.title || `会话 ${conv.createdAt.slice(0, 10)}`}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    onClick={(e) => e.stopPropagation()}
                    className='opacity-0 transition-opacity group-hover:opacity-100'
                    render={
                      <Button size='icon-xs' variant='ghost'>
                        <MoreHorizontal className='size-3' />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align='end'>
                    <DropdownMenuItem
                      variant='destructive'
                      className='cursor-pointer'
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteConv(conv.id);
                      }}
                    >
                      <Trash2 className='size-3' />
                      删除
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
            {(!conversations || conversations.length === 0) && (
              <p className='py-4 text-center text-xs text-muted-foreground'>暂无会话</p>
            )}
          </CardContent>
        </Card>

        {/* Main chat area */}
        <Card className='flex flex-1 flex-col min-h-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg'>
          <CardContent className='flex flex-1 flex-col overflow-hidden p-0'>
            {showMessages ? (
              <MessageScroller autoScroll={streamingMsgIdx !== null}>
                <MessageScrollerViewport>
                  <MessageScrollerContent className='p-(--card-spacing)'>
                    {messages.map((msg, i) => (
                      <MessageAnimated key={msg.id} scrollAnchor={msg.role === 'user'}>
                        <div
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${
                            msg.role === 'assistant' && !msg.content && !msg.reasoning
                              ? 'opacity-50'
                              : ''
                          }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg px-4 py-2 ${
                              msg.role === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            {msg.role === 'assistant' ? (
                              <AssistantMessage msg={msg} streaming={streamingMsgIdx === i} />
                            ) : (
                              <p className='whitespace-pre-wrap text-sm'>{msg.content}</p>
                            )}
                          </div>
                        </div>
                      </MessageAnimated>
                    ))}
                  </MessageScrollerContent>
                  <MessageScrollerButton />
                  <MessageScrollerSentinel />
                </MessageScrollerViewport>
              </MessageScroller>
            ) : (
              <Empty>
                <EmptyMedia variant='icon'>
                  <MessageSquare />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>开始与 {app.name} 对话</EmptyTitle>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>

          <CardFooter>
            <InputGroup className='w-full'>
              <InputGroupTextarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='输入消息... (Enter 发送, Shift+Enter 换行)'
                rows={2}
              />
              <InputGroupAddon align='block-end' className='pt-1'>
                <InputGroupButton
                  type='submit'
                  size='icon-xs'
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  className='ml-auto'
                >
                  {sending ? (
                    <span className='size-3 animate-spin rounded-full border-2 border-current border-t-transparent' />
                  ) : (
                    <SendHorizontal className='size-4' />
                  )}
                  <span className='sr-only'>发送</span>
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </CardFooter>
        </Card>
      </div>
    </FadeIn>
  );
}
