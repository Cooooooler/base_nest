'use client';

import { apiClient } from '@/lib/api-client';
import type { KnowledgeBase, ModelProvider } from '@base/shared';
import { useQuery } from '@tanstack/react-query';

export default function DashboardPage() {
  const { data: providers } = useQuery({
    queryKey: ['providers'],
    queryFn: () => apiClient<ModelProvider[]>('/providers'),
  });

  const { data: knowledgeBases } = useQuery({
    queryKey: ['knowledge-bases'],
    queryFn: () => apiClient<KnowledgeBase[]>('/knowledge'),
  });

  const totalDocs = knowledgeBases?.reduce((sum, kb) => sum + (kb.documents?.length ?? 0), 0) ?? 0;

  return (
    <div className='space-y-6'>
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <DashboardCard
          title='模型提供商'
          value={String(providers?.length ?? '—')}
          description='已配置的提供商'
        />
        <DashboardCard
          title='知识库'
          value={String(knowledgeBases?.length ?? '—')}
          description='创建的知识库'
        />
        <DashboardCard title='文档' value={String(totalDocs)} description='已处理的文档' />
        <DashboardCard title='系统状态' value='运行中' description='后端 API 已连接' />
      </div>
      <div className='rounded-lg border bg-card p-6 text-card-foreground'>
        <h2 className='text-lg font-semibold mb-2'>欢迎使用 Base Nest AI 平台</h2>
        <p className='text-muted-foreground'>
          从这里开始配置你的 AI 应用。先添加模型提供商，然后创建知识库，最后构建对话应用。
        </p>
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className='rounded-lg border bg-card p-4 text-card-foreground'>
      <p className='text-sm text-muted-foreground'>{title}</p>
      <p className='text-3xl font-bold mt-1'>{value}</p>
      <p className='text-xs text-muted-foreground mt-1'>{description}</p>
    </div>
  );
}
