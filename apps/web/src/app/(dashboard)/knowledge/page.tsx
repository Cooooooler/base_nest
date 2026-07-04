'use client';

import { FadeIn } from '@/components/animated/fade-in';
import { StaggerList } from '@/components/animated/stagger-list';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useDeleteKnowledgeBase, useKnowledgeBases } from '@/hooks/use-knowledge';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export default function KnowledgePage() {
  const router = useRouter();
  const { data: knowledgeBases, isLoading } = useKnowledgeBases();
  const deleteKb = useDeleteKnowledgeBase();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteKb.mutateAsync(deleteTarget.id);
      toast.success('知识库已删除');
      setDeleteDialogOpen(false);
      setTimeout(() => setDeleteTarget(null), 200);
    } catch {
      toast.error('删除失败');
    }
  };

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <Skeleton className='h-9 w-32' />
          <Skeleton className='h-10 w-28' />
        </div>
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className='h-40 rounded-xl' />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <p className='mt-1 text-sm text-muted-foreground'>管理知识库</p>
        <Button onClick={() => router.push('/knowledge/new')}>
          <Plus data-icon /> 创建知识库
        </Button>
      </div>

      {!knowledgeBases || knowledgeBases.length === 0 ? (
        <FadeIn direction='up'>
          <Card className='border-dashed'>
            <CardContent className='flex flex-col items-center gap-4 py-16'>
              <div className='flex size-12 items-center justify-center rounded-full bg-muted'>
                <FileText className='size-6 text-muted-foreground' />
              </div>
              <div className='text-center'>
                <p className='text-sm text-muted-foreground'>还没有创建知识库</p>
              </div>
              <Button onClick={() => router.push('/knowledge/new')}>
                <Plus data-icon /> 创建知识库
              </Button>
            </CardContent>
          </Card>
        </FadeIn>
      ) : (
        <StaggerList className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {knowledgeBases.map((kb) => (
            <Card
              key={kb.id}
              className='transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg'
            >
              <CardHeader className='pb-3'>
                <div className='flex items-start justify-between'>
                  <div className='min-w-0 flex-1'>
                    <CardTitle className='truncate text-base'>{kb.name}</CardTitle>
                    {kb.description && (
                      <p className='mt-1.5 line-clamp-2 text-sm text-muted-foreground'>
                        {kb.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant='ghost'
                    size='icon'
                    aria-label={`删除 ${kb.name}`}
                    onClick={() => {
                      setDeleteTarget({ id: kb.id, name: kb.name });
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className='size-4' />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className='space-y-1 text-sm text-muted-foreground'>
                  <p>
                    文档:{' '}
                    <span className='font-medium text-foreground'>{kb.documents?.length ?? 0}</span>
                  </p>
                  <p>
                    分块: {kb.chunkSize}字符 | 重叠: {kb.chunkOverlap}字符
                  </p>
                </div>
                <Button
                  onClick={() => router.push(`/knowledge/${kb.id}`)}
                  variant='outline'
                  size='sm'
                  className='mt-4 w-full'
                >
                  管理
                </Button>
              </CardContent>
            </Card>
          ))}
        </StaggerList>
      )}

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialogOpen(false);
            setTimeout(() => setDeleteTarget(null), 200);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除知识库 &ldquo;{deleteTarget?.name}&rdquo;
              吗？此操作不可撤销，关联的所有文档也将被删除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setDeleteDialogOpen(false);
                setTimeout(() => setDeleteTarget(null), 200);
              }}
            >
              取消
            </Button>
            <Button variant='destructive' disabled={deleteKb.isPending} onClick={handleDelete}>
              {deleteKb.isPending ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
