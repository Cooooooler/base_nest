'use client';

import { type Workflow, workflowApi } from '@/api/workflow';
import { FadeIn } from '@/components/animated/fade-in';
import { StaggerList } from '@/components/animated/stagger-list';
import { Button } from '@base/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@base/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@base/ui/dialog';
import { Field, FieldLabel } from '@base/ui/field';
import { Input } from '@base/ui/input';
import { Skeleton } from '@base/ui/skeleton';
import { Spinner } from '@base/ui/spinner';
import { Textarea } from '@base/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, Workflow as WfIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

const formSchema = z.object({
  name: z.string().min(1, '请输入名称'),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function WorkflowsPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleCreate = async (data: FormData) => {
    try {
      const wf = await workflowApi.create({
        name: data.name,
        description: data.description || undefined,
        graph: {
          nodes: [
            { id: 'start', type: 'start', label: '开始', position: { x: 50, y: 200 }, config: {} },
            {
              id: 'end',
              type: 'end',
              label: '结束',
              position: { x: 500, y: 200 },
              config: { output: '' },
            },
          ],
          edges: [{ id: 'e1', source: 'start', target: 'end' }],
        },
      });
      toast.success('工作流已创建');
      setCreateDialogOpen(false);
      reset();
      router.push(`/workflows/${wf.id}/edit`);
    } catch {
      toast.error('创建失败');
    }
  };

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

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
        <p className='mt-1 text-sm text-muted-foreground'>创建和管理 AI 工作流编排</p>
        <Button onClick={() => setCreateDialogOpen(true)}>
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
              <Button onClick={() => setCreateDialogOpen(true)}>
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
        open={createDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建工作流</DialogTitle>
            <DialogDescription>创建一个新的 AI 工作流</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleCreate)} className='flex flex-col gap-4 py-4'>
            <Controller
              name='name'
              control={control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel htmlFor='wf-name' required>
                    名称
                  </FieldLabel>
                  <Input
                    {...field}
                    id='wf-name'
                    placeholder='我的工作流'
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <p className='text-sm text-destructive'>{fieldState.error?.message}</p>
                  )}
                </Field>
              )}
            />
            <Controller
              name='description'
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor='wf-description'>描述</FieldLabel>
                  <Textarea {...field} id='wf-description' placeholder='工作流用途说明' />
                </Field>
              )}
            />
          </form>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                setCreateDialogOpen(false);
                reset();
              }}
            >
              取消
            </Button>
            <Button type='submit' disabled={isSubmitting}>
              {isSubmitting && <Spinner data-icon='inline-start' />}
              创建并编辑
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
