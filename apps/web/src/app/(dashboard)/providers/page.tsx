'use client';

import { Badge } from '@/components/ui/badge';
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
import { useDeleteProvider, useProviders } from '@/hooks/use-providers';
import { Plus, Server, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export default function ProvidersPage() {
  const router = useRouter();
  const { data: providers, isLoading } = useProviders();
  const deleteProvider = useDeleteProvider();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteProvider.mutateAsync(deleteTarget.id);
      toast.success('提供商已删除');
    } catch {
      toast.error('删除失败');
    }
    setDeleteTarget(null);
  }, [deleteTarget, deleteProvider]);

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
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>模型提供商</h1>
          <p className='mt-1 text-sm text-muted-foreground'>管理 AI 模型提供商和 API 密钥</p>
        </div>
        <Button onClick={() => router.push('/providers/new')}>
          <Plus data-icon='inline-start' />
          添加提供商
        </Button>
      </div>

      {!providers || providers.length === 0 ? (
        <Card className='border-dashed'>
          <CardContent className='flex flex-col items-center gap-4 py-16'>
            <div className='flex size-12 items-center justify-center rounded-full bg-muted'>
              <Server className='size-6 text-muted-foreground' />
            </div>
            <div className='text-center'>
              <p className='text-sm text-muted-foreground'>
                还没有配置模型提供商。点击下方按钮开始。
              </p>
            </div>
            <Button onClick={() => router.push('/providers/new')}>
              <Plus data-icon='inline-start' />
              添加提供商
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {providers.map((p) => (
            <Card key={p.id} className='transition-shadow hover:shadow-md'>
              <CardHeader className='pb-3'>
                <div className='flex items-start justify-between'>
                  <div className='min-w-0 flex-1'>
                    <CardTitle className='truncate text-base'>{p.name}</CardTitle>
                    <Badge variant='secondary' className='mt-1.5'>
                      {p.type}
                    </Badge>
                  </div>
                  <Button
                    variant='ghost'
                    size='icon'
                    aria-label={`删除 ${p.name}`}
                    onClick={() => setDeleteTarget({ id: p.id, name: p.name })}
                  >
                    <Trash2 className='size-4' />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className='space-y-1 text-sm text-muted-foreground'>
                  <p>
                    模型:{' '}
                    <span className='font-medium text-foreground'>{p.models?.length ?? 0}</span>
                  </p>
                  <p>
                    密钥:{' '}
                    <span className='font-medium text-foreground'>{p.apiKeys?.length ?? 0}</span>
                  </p>
                  {p.baseUrl && (
                    <p className='truncate' title={p.baseUrl}>
                      端点: {p.baseUrl}
                    </p>
                  )}
                </div>
                <Button
                  onClick={() => router.push(`/providers/${p.id}`)}
                  variant='outline'
                  size='sm'
                  className='mt-4 w-full'
                >
                  管理
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除提供商</DialogTitle>
            <DialogDescription>
              确定要删除 &ldquo;{deleteTarget?.name}&rdquo; 吗？此操作不可撤销，关联的 API
              密钥也将被删除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button
              variant='destructive'
              onClick={handleDelete}
              disabled={deleteProvider.isPending}
            >
              {deleteProvider.isPending ? '删除中…' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
