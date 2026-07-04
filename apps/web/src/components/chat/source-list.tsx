'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';
import type { ChatMessage } from './types';

const MarkdownRenderer = dynamic(
  // @ts-expect-error — dynamic import with @/ webpack alias
  () => import('@/components/app/markdown-renderer').then((mod) => mod.MarkdownRenderer),
  { ssr: false }
) as React.ComponentType<{ content: string }>;

export function SourceList({ data }: { data: NonNullable<ChatMessage['sources']> }) {
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSrc, setDialogSrc] = useState<(typeof data)[number] | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  return (
    <div className='mt-3 border-t border-border/50 pt-2'>
      <button
        className='flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors'
        onClick={() => setOpen(!open)}
      >
        <FileText className='size-3' />
        <span>
          {open ? '收起' : '展开'}来源（{data.length}）
        </span>
      </button>
      {open && (
        <div className='mt-2 flex flex-col gap-1.5'>
          {data.map((src, i) => (
            <button
              key={i}
              className='flex cursor-pointer items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-xs text-left hover:bg-muted/40 transition-colors'
              onClick={() => {
                setDialogSrc(src);
                setDialogOpen(true);
              }}
            >
              <span className='shrink-0 font-semibold text-muted-foreground'>[{i + 1}]</span>
              <span className='min-w-0 flex-1 truncate text-foreground'>
                {src.metadata?.fileName ? String(src.metadata.fileName) : '未知来源'}
              </span>
              {src.score !== undefined && (
                <span className='shrink-0 tabular-nums text-muted-foreground'>
                  {(src.score * 100).toFixed(0)}%
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(v) => {
          if (!v) {
            setDialogOpen(false);
            clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => setDialogSrc(null), 200);
          }
        }}
      >
        <DialogContent className='sm:max-w-4xl max-h-[80vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle className='text-base'>
              {dialogSrc?.metadata?.fileName ? String(dialogSrc.metadata.fileName) : '来源详情'}
            </DialogTitle>
          </DialogHeader>
          <MarkdownRenderer content={dialogSrc?.content || ''} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
