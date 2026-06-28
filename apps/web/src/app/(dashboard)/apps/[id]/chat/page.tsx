'use client';

import { type ChatChunk, streamChat } from '@/api/chat';
import { MarkdownRenderer } from '@/components/app/markdown-renderer';
import {
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
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import {
  Brain,
  FileText,
  MessageSquare,
  MoreHorizontal,
  Plus,
  SendHorizontal,
  Trash2,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  reasoning?: string;
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
          // 最终块：可能没有 content，但 fullContent 和 fullReasoning 已在前面累加完毕
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

  const showMessages = messages.length > 0;

  return (
    <div className='flex h-[calc(100vh-8rem)] gap-4'>
      {/* Conversation sidebar */}
      <Card size='sm' className='flex w-64 shrink-0 flex-col'>
        <CardHeader>
          <CardTitle>会话</CardTitle>
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
        <CardContent className='flex flex-col gap-1 p-3'>
          {conversations?.map((conv) => (
            <div
              key={conv.id}
              className={`group flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                activeConvId === conv.id ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
              }`}
              onClick={() => setActiveConvId(conv.id)}
            >
              <span className='truncate'>
                {conv.title || `会话 ${conv.createdAt.slice(0, 10)}`}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger
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
                      handleDeleteConv(conv.id);
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
      <Card className='flex flex-1 flex-col'>
        <CardContent className='flex flex-1 flex-col overflow-hidden p-0'>
          {showMessages ? (
            <MessageScroller>
              <MessageScrollerViewport>
                <MessageScrollerContent className='p-(--card-spacing)'>
                  {messages.map((msg, i) => (
                    <MessageAnimated key={i} scrollAnchor={msg.role === 'user'}>
                      <div
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
                                {msg.reasoning && <ReasoningBlock text={msg.reasoning} />}
                                <MarkdownRenderer content={msg.content} />
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
  );
}

function SourceList({ data }: { data: NonNullable<ChatMessage['sources']> }) {
  const [open, setOpen] = useState(false);
  const [dialogSrc, setDialogSrc] = useState<(typeof data)[number] | null>(null);

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
            <button
              key={i}
              className='flex cursor-pointer items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-xs text-left hover:bg-muted/40 transition-colors'
              onClick={() => setDialogSrc(src)}
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
            </button>
          ))}
        </div>
      )}

      <Dialog
        open={!!dialogSrc}
        onOpenChange={(v) => {
          if (!v) setDialogSrc(null);
        }}
      >
        <DialogContent className='sm:max-w-4xl max-h-[80vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle className='text-base'>
              {dialogSrc?.metadata?.fileName ? String(dialogSrc.metadata.fileName) : '来源详情'}
            </DialogTitle>
          </DialogHeader>
          <MarkdownRenderer content={dialogSrc?.content || ''} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReasoningBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(true);

  return (
    <div className='mb-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'>
      <button
        className='flex w-full cursor-pointer items-center gap-1.5 px-3 py-2 text-xs text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200 transition-colors'
        onClick={() => setOpen(!open)}
      >
        <Brain className='size-3' />
        <span className='font-medium'>思考过程</span>
        <span className='text-[10px] opacity-60'>{open ? '点击收起' : '点击展开'}</span>
      </button>
      {open && (
        <div className='border-t border-amber-200 px-3 py-2 text-xs leading-relaxed text-amber-800 whitespace-pre-wrap dark:border-amber-800 dark:text-amber-300'>
          {text}
        </div>
      )}
    </div>
  );
}
