'use client';

import { useCreateKnowledgeBase } from '@/hooks/use-knowledge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NewKnowledgeBasePage() {
  const router = useRouter();
  const createKb = useCreateKnowledgeBase();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [chunkSize, setChunkSize] = useState('500');
  const [chunkOverlap, setChunkOverlap] = useState('50');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) { toast.error('请输入知识库名称'); return; }
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
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>创建知识库</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">名称</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="产品文档库" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">描述（可选）</label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="知识库用途说明" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">分块大小</label>
                <Input type="number" value={chunkSize} onChange={(e) => setChunkSize(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">分块重叠</label>
                <Input type="number" value={chunkOverlap} onChange={(e) => setChunkOverlap(e.target.value)} />
              </div>
            </div>
            <Button type="submit" disabled={createKb.isPending}>
              {createKb.isPending ? '创建中...' : '创建'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
