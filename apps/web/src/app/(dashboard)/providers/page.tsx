'use client';

import { useProviders, useDeleteProvider } from '@/hooks/use-providers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import Link from 'next/link';
import { Plus, Trash2 } from 'lucide-react';

export default function ProvidersPage() {
  const { data: providers, isLoading } = useProviders();
  const deleteProvider = useDeleteProvider();

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除提供商 "${name}"？`)) return;
    try {
      await deleteProvider.mutateAsync(id);
      toast.success('提供商已删除');
    } catch {
      toast.error('删除失败');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">模型提供商</h2>
        <Button render={<Link href="/providers/new" />}>
            <Plus /> 添加提供商
          </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : providers?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            还没有配置模型提供商。点击"添加提供商"开始。
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {providers?.map((p) => (
            <Card key={p.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{p.name}</CardTitle>
                    <Badge variant="secondary" className="mt-1">{p.type}</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(p.id, p.name)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>模型: {p.models?.length ?? 0}</p>
                  <p>密钥: {p.apiKeys?.length ?? 0}</p>
                  {p.baseUrl && <p className="truncate">端点: {p.baseUrl}</p>}
                </div>
                <Button render={<Link href={`/providers/${p.id}`} />} variant="outline" size="sm" className="mt-3 w-full">管理</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
