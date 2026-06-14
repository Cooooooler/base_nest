'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useKnowledgeBases } from '@/hooks/use-knowledge';
import { useProviders } from '@/hooks/use-providers';
import { Activity, BookOpen, Bot, FileText } from 'lucide-react';

const statCards = [
  { key: 'providers', label: '模型提供商', icon: Bot },
  { key: 'knowledge', label: '知识库', icon: BookOpen },
  { key: 'documents', label: '文档', icon: FileText },
  { key: 'status', label: '系统状态', icon: Activity },
] as const;

export default function DashboardPage() {
  const { data: providers, isLoading: loadingProviders } = useProviders();
  const { data: knowledgeBases, isLoading: loadingKnowledge } = useKnowledgeBases();

  const totalDocs = knowledgeBases?.reduce((sum, kb) => sum + (kb.documents?.length ?? 0), 0) ?? 0;
  const isLoading = loadingProviders || loadingKnowledge;

  const stats = [
    { value: String(providers?.length ?? '—'), description: '已配置的提供商' },
    { value: String(knowledgeBases?.length ?? '—'), description: '创建的知识库' },
    { value: String(totalDocs), description: '已处理的文档' },
    { value: '运行中', description: '后端 API 已连接' },
  ];

  return (
    <div className='space-y-8'>
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>仪表盘</h1>
        <p className='mt-1 text-muted-foreground'>欢迎回来，查看你的 AI 平台概览</p>
      </div>

      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {statCards.map((card, i) => (
          <Card key={card.key} className='transition-shadow hover:shadow-md'>
            <CardContent className='p-6'>
              <div className='flex items-center gap-2'>
                <div className='flex size-8 items-center justify-center rounded-md bg-primary/10'>
                  <card.icon className='size-4 text-primary' />
                </div>
                <span className='text-sm font-medium text-muted-foreground'>{card.label}</span>
              </div>
              {isLoading ? (
                <Skeleton className='mt-3 h-8 w-16' />
              ) : (
                <p className='mt-3 text-3xl font-bold tracking-tight'>{stats[i].value}</p>
              )}
              <p className='mt-1 text-xs text-muted-foreground'>{stats[i].description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className='border-dashed'>
        <CardContent className='p-8 text-center'>
          <div className='mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10'>
            <Bot className='size-6 text-primary' />
          </div>
          <h2 className='mt-4 text-lg font-semibold'>欢迎使用 Base Nest AI 平台</h2>
          <p className='mt-1 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed'>
            从这里开始配置你的 AI 应用。先添加{' '}
            <span className='font-medium text-foreground'>模型提供商</span>，然后创建{' '}
            <span className='font-medium text-foreground'>知识库</span>，最后构建{' '}
            <span className='font-medium text-foreground'>对话应用</span>。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
