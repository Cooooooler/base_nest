'use client';

import { workflowApi, type Workflow } from '@/api/workflow';
import { FadeIn } from '@/components/animated/fade-in';
import { StaggerList } from '@/components/animated/stagger-list';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Trash2, Workflow as WfIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function WorkflowsPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await workflowApi.delete(deleteTarget.id);
      setWorkflows((prev) => prev.filter((w) => w.id !== deleteTarget.id));
      toast.success('已删除');
      setDeleteDialogOpen(false);
      setTimeout(() => setDeleteTarget(null), 200);
    } catch {
      toast.error('删除失败');
    }
  };

  const nodeCount = (wf: Workflow) => wf.graph?.nodes?.length ?? 0;
  const edgeCount = (wf: Workflow) => wf.graph?.edges?.length ?? 0;

  if (loading) {
    return (
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <Skeleton className='h-9 w-32' />
          <Skeleton className='h-10 w-28' />
        </div>
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className='h-40 rounded-xl' />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>工作流</h1>
          <p className='mt-1 text-sm text-muted-foreground'>创建和管理 AI 工作流编排</p>
        </div>
        <Button onClick={() => router.push('/workflows/new')}>
          <Plus data-icon /> 新建工作流
        </Button>
      </div>

      {workflows.length === 0 ? (
        <FadeIn direction='up'>
          <Card className='border-dashed'>
            <CardContent className='flex flex-col items-center gap-4 py-16'>
              <div className='flex size-12 items-center justify-center rounded-full bg-muted'>
                <WfIcon className='size-6 text-muted-foreground' />
              </div>
              <div className='text-center'>
                <p className='text-sm text-muted-foreground'>还没有创建工作流</p>
              </div>
              <Button onClick={() => router.push('/workflows/new')}>
                <Plus data-icon /> 新建工作流
              </Button>
            </CardContent>
          </Card>
        </FadeIn>
      ) : (
        <StaggerList className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {workflows.map((wf) => (
            <Link key={wf.id} href={`/workflows/${wf.id}/edit`} className='block group'>
              <Card className='transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg h-full relative'>
                <CardHeader className='pb-3'>
                  <div className='flex items-start justify-between'>
                    <div className='min-w-0 flex-1'>
                      <CardTitle className='truncate text-base group-hover:text-primary transition-colors'>
                        {wf.name}
                      </CardTitle>
                      {wf.description && (
                        <p className='mt-1.5 line-clamp-2 text-sm text-muted-foreground'>
                          {wf.description}
                        </p>
                      )}
                    </div>
                    <Button
                      variant='ghost'
                      size='icon'
                      aria-label={`删除 ${wf.name}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteTarget({ id: wf.id, name: wf.name });
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className='size-4' />
                    </Button>
                  </div>
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
        </StaggerList>
      )}

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialogOpen(false);
            setTimeout(() => setDeleteTarget(null), 200);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除工作流 &ldquo;{deleteTarget?.name}&rdquo; 吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setDeleteDialogOpen(false);
                setTimeout(() => setDeleteTarget(null), 200);
              }}
            >
              取消
            </Button>
            <Button variant='destructive' onClick={handleDelete}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
