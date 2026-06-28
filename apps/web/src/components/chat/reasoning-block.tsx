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
    <div className='mb-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30'>
      <button
        className='flex w-full cursor-pointer items-center gap-1.5 px-3 py-2 text-xs text-amber-700 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200 transition-colors'
        onClick={() => setOpen(!open)}
      >
        <Brain className='size-3' />
        <span className='font-medium'>思考过程</span>
        {streaming && <Spinner className='size-3' />}
        <span className='text-[10px] opacity-60'>{open ? '点击收起' : '点击展开'}</span>
      </button>
      {open && (
        <div className='border-t border-amber-200 px-3 py-2 dark:border-amber-800'>{children}</div>
      )}
    </div>
  );
}
