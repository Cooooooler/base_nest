'use client';

import { useCreateProvider } from '@/hooks/use-providers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const providerTypes = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic Claude' },
  { value: 'ollama', label: 'Ollama' },
  { value: 'openai-compatible', label: '兼容 OpenAI' },
  { value: 'langchain-ollama', label: 'LangChain Ollama' },
] as const;

export default function NewProviderPage() {
  const router = useRouter();
  const createProvider = useCreateProvider();
  const [name, setName] = useState('');
  const [type, setType] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !type) {
      toast.error('请填写名称和类型');
      return;
    }
    try {
      await createProvider.mutateAsync({
        name,
        type: type as any,
        baseUrl: baseUrl || undefined,
      });
      toast.success('提供商已创建');
      router.push('/providers');
    } catch {
      toast.error('创建失败');
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>添加模型提供商</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">名称</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="OpenAI" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">类型</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="选择类型" />
                </SelectTrigger>
                <SelectContent>
                  {providerTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">API 端点（可选）</label>
              <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" />
            </div>
            <Button type="submit" disabled={createProvider.isPending}>
              {createProvider.isPending ? '创建中...' : '创建'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
