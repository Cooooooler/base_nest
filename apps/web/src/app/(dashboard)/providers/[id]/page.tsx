'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
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
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export default function ProviderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: provider, isLoading } = useProvider(id);
  const { data: apiKeys, refetch: refetchKeys } = useProviderApiKeys(id);
  const createApiKey = useCreateApiKey();
  const deleteApiKey = useDeleteApiKey();

  const [keyName, setKeyName] = useState('');
  const [keyValue, setKeyValue] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newKeyResult, setNewKeyResult] = useState<string | null>(null);

  if (isLoading) return <Skeleton className='h-64 rounded-lg' />;
  if (!provider) return <div className='text-muted-foreground'>提供商未找到</div>;

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
      refetchKeys();
    } catch {
      toast.error('添加密钥失败');
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('确定删除此密钥？')) return;
    try {
      await deleteApiKey.mutateAsync(keyId);
      toast.success('密钥已删除');
      refetchKeys();
    } catch {
      toast.error('删除失败');
    }
  };

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold'>{provider.name}</h2>
          <div className='flex items-center gap-2 mt-1'>
            <Badge>{provider.type}</Badge>
            {provider.isEnabled && <Badge variant='secondary'>已启用</Badge>}
          </div>
        </div>
        <Button variant='outline' onClick={() => router.push('/providers')}>
          返回
        </Button>
      </div>

      {provider.baseUrl && (
        <p className='text-sm text-muted-foreground'>端点: {provider.baseUrl}</p>
      )}

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
              <DialogTrigger render={<Button size='sm' />}>
                <Plus />
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
                    <Input
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                      placeholder='密钥名称'
                    />
                    <Input
                      value={keyValue}
                      onChange={(e) => setKeyValue(e.target.value)}
                      placeholder='sk-...'
                      type='password'
                    />
                    <Button type='submit' disabled={createApiKey.isPending}>
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
            <p className='text-sm text-muted-foreground'>暂无 API 密钥</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>密钥</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell>{k.name}</TableCell>
                    <TableCell className='font-mono'>{k.maskedKey}</TableCell>
                    <TableCell>
                      {k.isActive ? (
                        <Badge variant='secondary'>启用</Badge>
                      ) : (
                        <Badge variant='outline'>禁用</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant='ghost' size='icon' onClick={() => handleDeleteKey(k.id)}>
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
    </div>
  );
}
