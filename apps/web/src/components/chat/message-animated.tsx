'use client';

import { cn } from '@base/ui';
import { useEffect, useRef } from 'react';

function MessageAnimated({
  className,
  scrollAnchor = false,
  children,
  ...props
}: React.ComponentProps<'div'> & { scrollAnchor?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAnchor && ref.current) {
      const viewport = ref.current.closest('[data-slot="message-scroller-viewport"]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [scrollAnchor]);

  return (
    <div
      ref={ref}
      data-slot='message-animated'
      data-anchor={scrollAnchor || undefined}
      className={cn('animate-in fade-in-0 slide-in-from-bottom-2 duration-300', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export { MessageAnimated };
