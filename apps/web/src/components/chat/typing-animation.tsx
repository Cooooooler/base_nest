'use client';

import { cn } from '@/lib/utils';

function TypingAnimation({
  text,
  className,
  ...props
}: React.ComponentProps<'span'> & {
  text: string;
}) {
  return (
    <span className={cn('whitespace-pre-wrap', className)} {...props}>
      {text}
    </span>
  );
}

export { TypingAnimation };
