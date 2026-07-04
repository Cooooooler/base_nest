'use client';

import { Spinner } from '@/components/ui/spinner';
import { Brain } from 'lucide-react';
import { useState } from 'react';

export function ReasoningBlock({
  streaming = false,
  children,
}: {
  streaming?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className='mb-3 rounded-lg border border-muted-foreground/15 bg-muted/40'>
      <button
        className='flex w-full cursor-pointer items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors'
        onClick={() => setOpen(!open)}
      >
        <Brain className='size-3' />
        <span className='font-medium'>思考过程</span>
        {streaming && <Spinner className='size-3' />}
        <span className='text-[10px] opacity-60'>{open ? '点击收起' : '点击展开'}</span>
      </button>
      {open && (
        <div className='border-t border-muted-foreground/15 px-3 py-2 text-sm text-muted-foreground italic leading-relaxed'>
          {children}
        </div>
      )}
    </div>
  );
}
