'use client';

import { cn } from '@base/ui';
import type { ReactNode } from 'react';

interface FadeInProps extends React.ComponentProps<'div'> {
  children: ReactNode;
  direction?: 'up' | 'down' | 'none';
  delay?: number;
  duration?: number;
}

export function FadeIn({
  children,
  direction = 'up',
  delay = 0,
  duration = 350,
  className,
  style,
  ...rest
}: FadeInProps) {
  const animationClass =
    direction === 'none'
      ? 'animate-in fade-in-0'
      : direction === 'down'
        ? 'animate-fade-in-down'
        : 'animate-fade-in-up';

  return (
    <div
      className={cn(animationClass, className)}
      style={{
        animationDuration: `${duration}ms`,
        animationDelay: `${delay}ms`,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
