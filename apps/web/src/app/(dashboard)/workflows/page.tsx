'use client';

import { workflowApi, type Workflow } from '@/api/workflow';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, Trash2, Workflow as WfIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function WorkflowsPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = () => {
    setLoading(true);
    workflowApi
      .list()
      .then(setWorkflows)
      .catch(() => toast.error('加载失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定删除 "${name}"？此操作不可撤销。`)) return;
    try {
      await workflowApi.delete(id);
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
      toast.success('已删除');
    } catch {
      toast.error('删除失败');
    }
  };

  const nodeCount = (wf: Workflow) => wf.graph?.nodes?.length ?? 0;
  const edgeCount = (wf: Workflow) => wf.graph?.edges?.length ?? 0;

  if (loading) {
    return (
      <div className='p-6 flex items-center justify-center h-64'>
        <Loader2 className='w-6 h-6 animate-spin text-muted-foreground' />
      </div>
    );
  }

  return (
    <div className='p-6'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-2xl font-bold'>工作流</h1>
          <p className='text-sm text-muted-foreground mt-1'>创建和管理 AI 工作流编排</p>
        </div>
        <Button onClick={() => router.push('/workflows/new')}>
          <Plus className='w-4 h-4 mr-1' />
          新建工作流
        </Button>
      </div>

      {workflows.length === 0 ? (
        <Card className='border-dashed'>
          <CardContent className='flex flex-col items-center justify-center py-16'>
            <WfIcon className='w-12 h-12 text-muted-foreground/40 mb-4' />
            <h3 className='text-lg font-medium text-muted-foreground'>暂无工作流</h3>
            <p className='text-sm text-muted-foreground/60 mt-1 mb-4'>创建第一个工作流开始编排</p>
            <Button onClick={() => router.push('/workflows/new')}>
              <Plus className='w-4 h-4 mr-1' />
              新建工作流
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {workflows.map((wf) => (
            <Link key={wf.id} href={`/workflows/${wf.id}/edit`} className='block group'>
              <Card className='hover:shadow-md transition-shadow cursor-pointer h-full relative'>
                <CardHeader className='pb-2'>
                  <div className='flex items-start justify-between'>
                    <CardTitle className='text-base group-hover:text-primary transition-colors'>
                      {wf.name}
                    </CardTitle>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(wf.id, wf.name);
                      }}
                      className='p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity'
                      title='删除'
                    >
                      <Trash2 className='w-4 h-4' />
                    </button>
                  </div>
                  {wf.description && <CardDescription>{wf.description}</CardDescription>}
                </CardHeader>
                <CardContent>
                  <div className='flex items-center gap-4 text-xs text-muted-foreground'>
                    <span>{nodeCount(wf)} 个节点</span>
                    <span>{edgeCount(wf)} 条连线</span>
                    <span className='ml-auto'>
                      {new Date(wf.updatedAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
