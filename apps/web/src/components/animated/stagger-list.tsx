'use client';

import { cn } from '@base/ui';
import type { ReactNode } from 'react';
import React from 'react';

import { FadeIn } from './fade-in';

interface StaggerListProps {
  children: ReactNode;
  staggerDelay?: number; // ms between each item, 默认 60
  direction?: 'up' | 'down' | 'none'; // 默认 'up'
  className?: string;
  as?: 'div' | 'ul' | 'ol';
}

export function StaggerList({
  children,
  staggerDelay = 60,
  direction = 'up',
  className,
  as: Tag = 'div',
}: StaggerListProps) {
  const items = React.Children.toArray(children);

  return (
    <Tag className={cn(className)}>
      {items.map((child, index) => (
        <FadeIn key={index} direction={direction} delay={index * staggerDelay}>
          {child}
        </FadeIn>
      ))}
    </Tag>
  );
}
