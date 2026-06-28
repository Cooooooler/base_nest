'use client';

import { ChevronDownIcon } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ── Context ──────────────────────────────────────────────────────────

interface MessageScrollerContextValue {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  bottomSentinelRef: React.RefObject<HTMLDivElement | null>;
  isAtBottom: boolean;
  isScrolledUp: boolean;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
}

const MessageScrollerContext = createContext<MessageScrollerContextValue | null>(null);

function useMessageScroller() {
  const ctx = useContext(MessageScrollerContext);
  if (!ctx) {
    throw new Error('MessageScroller components must be used within <MessageScrollerProvider>');
  }
  return ctx;
}

// ── Provider ─────────────────────────────────────────────────────────

function MessageScrollerProvider({
  children,
  autoScroll,
}: {
  children: React.ReactNode;
  autoScroll?: boolean;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    const sentinel = bottomSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsAtBottom(entry.isIntersecting);
      },
      {
        root: viewportRef.current,
        rootMargin: '0px',
        threshold: 0,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    viewportRef.current?.scrollTo({
      top: viewportRef.current.scrollHeight,
      behavior,
    });
  }, []);

  // 流式/加载过程中自动滚动到底部
  useLayoutEffect(() => {
    if (!autoScroll || !viewportRef.current) return;
    viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
  });

  return (
    <MessageScrollerContext.Provider
      value={{
        viewportRef,
        bottomSentinelRef,
        isAtBottom,
        isScrolledUp: !isAtBottom,
        scrollToBottom,
      }}
    >
      {children}
    </MessageScrollerContext.Provider>
  );
}

// ── Scroller root ────────────────────────────────────────────────────

function MessageScroller({
  autoScroll = false,
  className,
  ...props
}: React.ComponentProps<'div'> & { autoScroll?: boolean }) {
  return (
    <MessageScrollerProvider autoScroll={autoScroll}>
      <div
        data-slot='message-scroller'
        className={cn('flex flex-1 flex-col overflow-hidden', className)}
        {...props}
      />
    </MessageScrollerProvider>
  );
}

// ── Viewport ─────────────────────────────────────────────────────────

function MessageScrollerViewport({ className, children, ...props }: React.ComponentProps<'div'>) {
  const { viewportRef } = useMessageScroller();

  return (
    <div
      ref={viewportRef}
      data-slot='message-scroller-viewport'
      role='log'
      aria-relevant='additions'
      aria-label='Chat messages'
      className={cn('flex-1 overflow-y-auto', className)}
      {...props}
    >
      {children}
    </div>
  );
}

// ── Content wrapper ──────────────────────────────────────────────────

function MessageScrollerContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='message-scroller-content'
      className={cn('flex flex-col gap-4', className)}
      {...props}
    />
  );
}

// ── Scroll-to-bottom button ──────────────────────────────────────────

function MessageScrollerButton({ className }: { className?: string }) {
  const { isAtBottom, scrollToBottom } = useMessageScroller();

  if (isAtBottom) return null;

  return (
    <div className={cn('sticky bottom-2 z-10 flex justify-center', className)}>
      <Button
        size='icon-sm'
        variant='outline'
        className='size-7 rounded-full shadow-sm'
        onClick={() => scrollToBottom('smooth')}
        aria-label='Scroll to bottom'
      >
        <ChevronDownIcon className='size-3' />
        <span className='sr-only'>Scroll to bottom</span>
      </Button>
    </div>
  );
}

// ── Bottom sentinel (internal) ───────────────────────────────────────

function MessageScrollerSentinel() {
  const { bottomSentinelRef } = useMessageScroller();
  return <div ref={bottomSentinelRef} className='pointer-events-none h-px' aria-hidden='true' />;
}

export {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerProvider,
  MessageScrollerSentinel,
  MessageScrollerViewport,
  useMessageScroller,
};
