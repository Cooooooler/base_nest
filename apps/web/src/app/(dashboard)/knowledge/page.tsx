'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useDeleteKnowledgeBase, useKnowledgeBases } from '@/hooks/use-knowledge';
import { FileText, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function KnowledgePage() {
  const { data: knowledgeBases, isLoading } = useKnowledgeBases();
  const deleteKb = useDeleteKnowledgeBase();
  const router = useRouter();

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除知识库 "${name}"？`)) return;
    try {
      await deleteKb.mutateAsync(id);
      toast.success('知识库已删除');
    } catch {
      toast.error('删除失败');
    }
  };

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-2xl font-bold'>知识库</h2>
        <Button render={<Link href='/knowledge/new' />}>
          <Plus /> 创建知识库
        </Button>
      </div>

      {isLoading ? (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className='h-32 rounded-lg' />
          ))}
        </div>
      ) : knowledgeBases?.length === 0 ? (
        <Card>
          <CardContent className='py-12 text-center text-muted-foreground'>
            还没有创建知识库。点击"创建知识库"开始。
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
                  <Button variant='ghost' size='icon' onClick={() => handleDelete(kb.id, kb.name)}>
                    <Trash2 className='size-4' />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {kb.description && (
                  <p className='text-sm text-muted-foreground mb-2 line-clamp-2'>
                    {kb.description}
                  </p>
                )}
                <div className='text-sm text-muted-foreground space-y-1'>
                  <p>文档: {kb.documents?.length ?? 0}</p>
                  <p>
                    分块: {kb.chunkSize}字符 | 重叠: {kb.chunkOverlap}字符
                  </p>
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  className='mt-3 w-full'
                  render={<Link href={`/knowledge/${kb.id}`} />}
                >
                  管理
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
