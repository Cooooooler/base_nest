'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreateKnowledgeBase } from '@/hooks/use-knowledge';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export default function NewKnowledgeBasePage() {
  const router = useRouter();
  const createKb = useCreateKnowledgeBase();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [chunkSize, setChunkSize] = useState('500');
  const [chunkOverlap, setChunkOverlap] = useState('50');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast.error('请输入知识库名称');
      return;
    }
    try {
      await createKb.mutateAsync({
        name,
        description: description || undefined,
        chunkSize: parseInt(chunkSize) || 500,
        chunkOverlap: parseInt(chunkOverlap) || 50,
      });
      toast.success('知识库已创建');
      router.push('/knowledge');
    } catch {
      toast.error('创建失败');
    }
  };

  return (
    <div className='mx-auto max-w-lg'>
      <Card>
        <CardHeader>
          <CardTitle>创建知识库</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
            <div className='flex flex-col gap-2'>
              <label htmlFor='kb-name' className='text-sm font-medium'>
                名称
              </label>
              <Input
                id='kb-name'
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='产品文档库'
              />
            </div>
            <div className='flex flex-col gap-2'>
              <label htmlFor='kb-description' className='text-sm font-medium'>
                描述
              </label>
              <Textarea
                id='kb-description'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='知识库用途说明'
              />
            </div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='flex flex-col gap-2'>
                <label htmlFor='kb-chunk-size' className='text-sm font-medium'>
                  分块大小
                </label>
                <Input
                  id='kb-chunk-size'
                  type='number'
                  value={chunkSize}
                  onChange={(e) => setChunkSize(e.target.value)}
                />
              </div>
              <div className='flex flex-col gap-2'>
                <label htmlFor='kb-chunk-overlap' className='text-sm font-medium'>
                  分块重叠
                </label>
                <Input
                  id='kb-chunk-overlap'
                  type='number'
                  value={chunkOverlap}
                  onChange={(e) => setChunkOverlap(e.target.value)}
                />
              </div>
            </div>
            <Button className='cursor-pointer' type='submit' disabled={createKb.isPending}>
              {createKb.isPending ? '创建中...' : '创建'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
