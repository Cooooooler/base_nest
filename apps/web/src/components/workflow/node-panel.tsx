'use client';

import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { XIcon } from 'lucide-react';

interface NodePanelProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

/**
 * Custom panel for workflow node configuration.
 * Rendered inside the flow container as an absolutely-positioned overlay.
 * Does NOT close on outside click — only the close button or parent control.
 */
export function NodePanel({ open, onClose, children, className }: NodePanelProps) {
  if (!open) return null;

  return (
    <div
      className={cn(
        'absolute right-0 top-0 z-50 flex h-full w-100 flex-col overflow-auto rounded-l-3xl bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg',
        className
      )}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/*node-panel-title*/}
      <div>
        <Button variant='ghost' size='icon-sm' onClick={onClose}>
          <XIcon />
          <span className='sr-only'>Close</span>
        </Button>
      </div>
      {children}
    </div>
  );
}
