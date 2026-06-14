'use client';

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
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

export default function KnowledgePage() {
  const { data: knowledgeBases, isLoading } = useKnowledgeBases();
  const deleteKb = useDeleteKnowledgeBase();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteKb.mutateAsync(deleteTarget.id);
      toast.success('知识库已删除');
      setDeleteTarget(null);
    } catch {
      toast.error('删除失败');
    }
  };

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-2xl font-bold'>知识库</h2>
        <Button render={<Link href='/knowledge/new' />}>
          <Plus data-icon /> 创建知识库
        </Button>
      </div>

      {isLoading ? (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className='h-5 w-3/5' />
              </CardHeader>
              <CardContent className='flex flex-col gap-2'>
                <Skeleton className='h-4 w-full' />
                <Skeleton className='h-4 w-4/5' />
                <Skeleton className='h-8 w-full rounded-md' />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : knowledgeBases?.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center gap-3 py-16'>
            <FileText className='size-12 text-muted-foreground' />
            <p className='text-sm text-muted-foreground'>还没有创建知识库</p>
            <Button render={<Link href='/knowledge/new' />}>
              <Plus data-icon /> 创建知识库
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {knowledgeBases?.map((kb) => (
            <Card key={kb.id}>
              <CardHeader>
                <div className='flex items-start justify-between'>
                  <div className='flex items-center gap-2'>
                    <FileText className='size-5 text-muted-foreground' />
                    <CardTitle className='text-lg'>{kb.name}</CardTitle>
                  </div>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => setDeleteTarget({ id: kb.id, name: kb.name })}
                  >
                    <Trash2 className='size-4' />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className='flex flex-col gap-1'>
                {kb.description && (
                  <p className='line-clamp-2 text-sm text-muted-foreground'>{kb.description}</p>
                )}
                <p className='text-sm text-muted-foreground'>文档: {kb.documents?.length ?? 0}</p>
                <p className='text-sm text-muted-foreground'>
                  分块: {kb.chunkSize}字符 | 重叠: {kb.chunkOverlap}字符
                </p>
                <Button
                  variant='outline'
                  size='sm'
                  className='w-full'
                  render={<Link href={`/knowledge/${kb.id}`} />}
                >
                  管理
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除知识库 &ldquo;{deleteTarget?.name}&rdquo;
              吗？此操作不可撤销，关联的所有文档也将被删除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDeleteTarget(null)}>
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
