'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateApp } from '@/hooks/use-chat';
import { useKnowledgeBases } from '@/hooks/use-knowledge';
import { useProviderModels, useProviders } from '@/hooks/use-providers';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export default function NewAppPage() {
  const router = useRouter();
  const createApp = useCreateApp();
  const { data: providers } = useProviders();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [providerId, setProviderId] = useState('');
  const [modelId, setModelId] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState('0.7');
  const [knowledgeBaseId, setKnowledgeBaseId] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: models } = useProviderModels(providerId);
  const { data: knowledgeBases } = useKnowledgeBases();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !providerId || !modelId) {
      toast.error('请填写必要字段');
      return;
    }
    setSaving(true);
    try {
      const app = await createApp.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        providerId,
        modelId,
        systemPrompt,
        temperature: parseFloat(temperature),
        maxTokens: 4096,
        knowledgeBaseId: knowledgeBaseId || undefined,
      });
      toast.success('应用已创建');
      router.push(`/apps/${app.id}/chat`);
    } catch {
      toast.error('创建失败');
    }
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className='mx-auto max-w-2xl'>
      <Card>
        <CardHeader>
          <CardTitle>新建对话应用</CardTitle>
        </CardHeader>
        <CardContent className='flex flex-col gap-4'>
          <Field>
            <FieldLabel>名称 *</FieldLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder='智能客服' />
          </Field>

          <Field>
            <FieldLabel>描述</FieldLabel>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='应用描述（可选）'
            />
          </Field>

          <Field>
            <FieldLabel>模型提供商 *</FieldLabel>
            <Select
              value={providerId}
              onValueChange={(v) => {
                if (v) {
                  setProviderId(v);
                  setModelId('');
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder='选择提供商' />
              </SelectTrigger>
              <SelectContent>
                {providers?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>模型 *</FieldLabel>
            <Select
              value={modelId}
              onValueChange={(v) => {
                if (v) setModelId(v);
              }}
              disabled={!providerId}
            >
              <SelectTrigger>
                <SelectValue placeholder={providerId ? '选择模型' : '请先选择提供商'} />
              </SelectTrigger>
              <SelectContent>
                {models?.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.displayName || m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>系统提示词</FieldLabel>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder='你是一个智能助手。用户问题：{{query}}'
              rows={4}
            />
            <p className='text-xs text-muted-foreground'>
              支持 &#123;&#123;query&#125;&#125;、&#123;&#123;date&#125;&#125; 变量
            </p>
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
              {saving ? '创建中...' : '创建'}
            </Button>
            <Button variant='outline' type='button' onClick={() => router.back()}>
              取消
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
