'use client';

import { createContext, type ReactNode, useContext, useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { XIcon } from 'lucide-react';

interface NodePanelContextValue {
  onClose: () => void;
}

const NodePanelContext = createContext<NodePanelContextValue>({
  onClose: () => {},
});

function useNodePanel() {
  return useContext(NodePanelContext);
}

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
  const contextValue = useMemo(() => ({ onClose }), [onClose]);

  if (!open) return null;

  return (
    <NodePanelContext.Provider value={contextValue}>
      <div
        className={cn(
          'absolute right-0 top-0 z-50 flex h-full w-100 flex-col overflow-auto rounded-l-xl bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg',
          className
        )}
        role='dialog'
        aria-label='Node configuration panel'
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      >
        {children}
      </div>
    </NodePanelContext.Provider>
  );
}

export function NodePanelHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='node-panel-header'
      className={cn('flex items-center justify-between px-4 py-2', className)}
      {...props}
    />
  );
}

export function NodePanelLeftTitle({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='node-panel-left-title'
      className={cn('flex items-center gap-2', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function NodePanelRightTitle({ className, ...props }: React.ComponentProps<'div'>) {
  const { onClose } = useNodePanel();
  return (
    <div
      data-slot='node-panel-right-title'
      className={cn('flex items-center gap-2', className)}
      {...props}
    >
      <Button variant='ghost' size='icon-sm' onClick={onClose}>
        <XIcon />
        <span className='sr-only'>Close</span>
      </Button>
    </div>
  );
}
