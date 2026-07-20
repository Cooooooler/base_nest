'use client';

import { cn } from '@base/ui';

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
