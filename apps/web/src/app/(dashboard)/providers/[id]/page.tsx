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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useCreateApiKey,
  useDeleteApiKey,
  useProvider,
  useProviderApiKeys,
} from '@/hooks/use-providers';
import { Plus, Trash2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export default function ProviderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: provider, isLoading } = useProvider(id);
  const { data: apiKeys, refetch: refetchKeys } = useProviderApiKeys(id);
  const createApiKey = useCreateApiKey();
  const deleteApiKey = useDeleteApiKey();

  const [keyName, setKeyName] = useState('');
  const [keyValue, setKeyValue] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newKeyResult, setNewKeyResult] = useState<string | null>(null);
  const [deleteKeyTarget, setDeleteKeyTarget] = useState<{ id: string; name: string } | null>(null);

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await createApiKey.mutateAsync({
        providerId: id,
        name: keyName,
        apiKey: keyValue,
      });
      setNewKeyResult(result.maskedKey);
      setKeyName('');
      setKeyValue('');
      await refetchKeys();
    } catch {
      toast.error('添加密钥失败');
    }
  };

  const handleDeleteKey = async () => {
    if (!deleteKeyTarget) return;
    try {
      await deleteApiKey.mutateAsync(deleteKeyTarget.id);
      toast.success('密钥已删除');
      setDeleteKeyTarget(null);
      await refetchKeys();
    } catch {
      toast.error('删除失败');
    }
  };

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <Skeleton className='size-8' />
          <div className='flex-1' />
        </div>
        <div className='space-y-2'>
          <Skeleton className='h-9 w-48' />
          <Skeleton className='h-5 w-24' />
        </div>
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <Skeleton className='h-6 w-24' />
              <Skeleton className='h-7 w-28' />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className='h-32 rounded-lg' />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className='flex flex-col items-center gap-4 py-16 text-center'>
        <p className='text-muted-foreground'>提供商未找到</p>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <div className='flex items-center gap-2'>
            <h1 className='text-2xl font-bold tracking-tight'>{provider.name}</h1>
            <Badge variant='secondary'>{provider.type}</Badge>
            {provider.isEnabled && <Badge variant='default'>已启用</Badge>}
          </div>
          {provider.baseUrl && (
            <p className='mt-0.5 text-sm text-muted-foreground'>{provider.baseUrl}</p>
          )}
        </div>
      </div>

      {/* API Keys Section */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-lg'>API 密钥</CardTitle>
            <Dialog
              open={dialogOpen}
              onOpenChange={(o) => {
                setDialogOpen(o);
                if (!o) {
                  setNewKeyResult(null);
                  setKeyName('');
                  setKeyValue('');
                }
              }}
            >
              <DialogTrigger render={<Button className='cursor-pointer' size='sm' />}>
                <Plus data-icon='inline-start' />
                添加密钥
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{newKeyResult ? '密钥已创建' : '添加 API 密钥'}</DialogTitle>
                </DialogHeader>
                {newKeyResult ? (
                  <div className='space-y-4'>
                    <p className='text-sm text-muted-foreground'>密钥已加密存储。显示值：</p>
                    <p className='font-mono text-lg'>{newKeyResult}</p>
                    <Button
                      className='cursor-pointer'
                      onClick={() => {
                        setNewKeyResult(null);
                        setDialogOpen(false);
                      }}
                    >
                      完成
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleAddKey} className='space-y-4'>
                    <div className='space-y-2'>
                      <label className='text-sm font-medium' htmlFor='key-name'>
                        密钥名称
                      </label>
                      <Input
                        id='key-name'
                        value={keyName}
                        onChange={(e) => setKeyName(e.target.value)}
                        placeholder='生产密钥'
                      />
                    </div>
                    <div className='space-y-2'>
                      <label className='text-sm font-medium' htmlFor='key-value'>
                        API 密钥
                      </label>
                      <Input
                        id='key-value'
                        value={keyValue}
                        onChange={(e) => setKeyValue(e.target.value)}
                        placeholder='sk-...'
                        type='password'
                      />
                    </div>
                    <Button
                      className='cursor-pointer'
                      type='submit'
                      disabled={createApiKey.isPending}
                    >
                      {createApiKey.isPending ? '加密中...' : '保存'}
                    </Button>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {!apiKeys || apiKeys.length === 0 ? (
            <p className='py-4 text-center text-sm text-muted-foreground'>
              暂无 API 密钥。点击上方按钮添加。
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>密钥</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className='w-16'>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className='font-medium'>{k.name}</TableCell>
                    <TableCell className='font-mono'>{k.maskedKey}</TableCell>
                    <TableCell>
                      {k.isActive ? (
                        <Badge variant='secondary'>启用</Badge>
                      ) : (
                        <Badge variant='outline'>禁用</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        className='cursor-pointer'
                        variant='ghost'
                        size='icon'
                        aria-label={`删除密钥 ${k.name}`}
                        onClick={() => setDeleteKeyTarget({ id: k.id, name: k.name })}
                      >
                        <Trash2 className='size-4' />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Key Confirmation Dialog */}
      <Dialog
        open={!!deleteKeyTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteKeyTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除 API 密钥</DialogTitle>
            <DialogDescription>
              确定要删除密钥 &ldquo;{deleteKeyTarget?.name}&rdquo;
              吗？此操作不可撤销，使用该密钥的应用将立即失效。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              className='cursor-pointer'
              variant='outline'
              onClick={() => setDeleteKeyTarget(null)}
            >
              取消
            </Button>
            <Button
              className='cursor-pointer'
              variant='destructive'
              onClick={handleDeleteKey}
              disabled={deleteApiKey.isPending}
            >
              {deleteApiKey.isPending ? '删除中…' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
