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
import { useApps, useDeleteApp } from '@/hooks/use-chat';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export default function AppsPage() {
  const router = useRouter();
  const { data: apps, isLoading } = useApps();
  const deleteApp = useDeleteApp();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteApp.mutateAsync(deleteTarget.id);
      toast.success('应用已删除');
      setDeleteTarget(null);
    } catch {
      toast.error('删除失败');
    }
  };

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-2xl font-bold'>对话应用</h2>
        <Button className='cursor-pointer' size='sm' onClick={() => router.push('/apps/new')}>
          <Plus data-icon />
          新建应用
        </Button>
      </div>

      {isLoading ? (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className='h-5 w-32' />
              </CardHeader>
              <CardContent>
                <Skeleton className='h-4 w-full' />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !apps || apps.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center gap-3 py-12'>
            <MessageSquare className='size-12 text-muted-foreground' />
            <p className='text-muted-foreground'>还没有对话应用</p>
            <Button className='cursor-pointer' onClick={() => router.push('/apps/new')}>
              创建第一个应用
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {apps.map((app) => (
            <Card
              key={app.id}
              className='cursor-pointer transition-colors hover:bg-accent/50'
              onClick={() => router.push(`/apps/${app.id}/chat`)}
            >
              <CardHeader className='flex flex-row items-start justify-between'>
                <div>
                  <CardTitle className='text-lg'>{app.name}</CardTitle>
                  {app.description && (
                    <p className='mt-1 text-sm text-muted-foreground line-clamp-2'>
                      {app.description}
                    </p>
                  )}
                </div>
                <Button
                  className='cursor-pointer shrink-0'
                  variant='ghost'
                  size='icon'
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget({ id: app.id, name: app.name });
                  }}
                >
                  <Trash2 className='size-4' />
                </Button>
              </CardHeader>
              <CardContent>
                <p className='text-xs text-muted-foreground'>
                  {new Date(app.createdAt).toLocaleDateString('zh-CN')}
                </p>
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
              确定要删除应用 &ldquo;{deleteTarget?.name}&rdquo; 吗？所有关联会话将被删除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              className='cursor-pointer'
              variant='outline'
              onClick={() => setDeleteTarget(null)}
            >
              取消
            </Button>
            <Button
              className='cursor-pointer'
              variant='destructive'
              disabled={deleteApp.isPending}
              onClick={handleDelete}
            >
              {deleteApp.isPending ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
