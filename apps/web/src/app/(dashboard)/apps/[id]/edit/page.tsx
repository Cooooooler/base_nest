'use client';

import { FadeIn } from '@/components/animated/fade-in';
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
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useApp, useDeleteApp, useUpdateApp } from '@/hooks/use-chat';
import { useKnowledgeBases } from '@/hooks/use-knowledge';
import { useProviders } from '@/hooks/use-providers';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function EditAppPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: app, isLoading } = useApp(id);
  const updateApp = useUpdateApp();
  const deleteApp = useDeleteApp();
  const { data: providers } = useProviders();
  const { data: knowledgeBases } = useKnowledgeBases();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState('0.7');
  const [knowledgeBaseId, setKnowledgeBaseId] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (app) {
      setName(app.name);
      setDescription(app.description || '');
      setSystemPrompt(app.systemPrompt || '');
      setTemperature(String(app.temperature));
      setKnowledgeBaseId(app.knowledgeBaseId || '');
    }
  }, [app]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateApp.mutateAsync({
        id,
        name: name.trim(),
        description: description.trim() || undefined,
        systemPrompt,
        temperature: parseFloat(temperature),
        knowledgeBaseId: knowledgeBaseId || undefined,
      });
      toast.success('应用已更新');
      router.push(`/apps/${id}/chat`);
    } catch {
      toast.error('更新失败');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    try {
      await deleteApp.mutateAsync(id);
      toast.success('应用已删除');
      router.push('/apps');
    } catch {
      toast.error('删除失败');
    }
  };

  if (isLoading) {
    return (
      <div className='mx-auto max-w-2xl'>
        <FadeIn direction='up'>
          <Card>
            <CardHeader>
              <Skeleton className='h-6 w-32' />
            </CardHeader>
            <CardContent className='flex flex-col gap-4'>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className='h-10 w-full' />
              ))}
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    );
  }

  if (!app) return <p className='text-muted-foreground'>应用未找到</p>;

  return (
    <>
      <form onSubmit={handleSubmit} className='mx-auto max-w-2xl'>
        <FadeIn direction='up'>
          <Card>
            <CardHeader>
              <CardTitle>编辑应用</CardTitle>
            </CardHeader>
            <CardContent className='flex flex-col gap-4'>
              <Field>
                <FieldLabel>名称</FieldLabel>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel>描述</FieldLabel>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel>系统提示词</FieldLabel>
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={4}
                />
              </Field>
              <Field>
                <FieldLabel>温度 ({temperature})</FieldLabel>
                <Input
                  type='range'
                  min='0'
                  max='2'
                  step='0.1'
                  value={temperature}
                  onChange={(e) => setTemperature(e.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel>关联知识库（可选）</FieldLabel>
                <Select
                  value={knowledgeBaseId}
                  onValueChange={(v) => {
                    if (v) setKnowledgeBaseId(v);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='不关联知识库' />
                  </SelectTrigger>
                  <SelectContent>
                    {knowledgeBases?.map((kb) => (
                      <SelectItem key={kb.id} value={kb.id}>
                        {kb.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <div className='flex gap-3'>
                <Button type='submit' disabled={saving}>
                  {saving ? '保存中...' : '保存'}
                </Button>
                <Button variant='outline' type='button' onClick={() => router.back()}>
                  取消
                </Button>
                <Button
                  className='ml-auto'
                  variant='destructive'
                  type='button'
                  onClick={() => setShowDelete(true)}
                >
                  删除应用
                </Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </form>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>删除后所有会话数据将丢失，此操作不可撤销。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setShowDelete(false)}>
              取消
            </Button>
            <Button variant='destructive' onClick={handleDelete}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
