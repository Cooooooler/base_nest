'use client';

import { apiUpload } from '@/api/client';
import { FadeIn } from '@/components/animated/fade-in';
import {
  useDeleteDocument,
  useDocuments,
  useKnowledgeBase,
  useRetrieval,
} from '@/hooks/use-knowledge';
import type { Document } from '@base/shared';
import { Badge } from '@base/ui/badge';
import { Button } from '@base/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@base/ui/card';
import { DataTable } from '@base/ui/data-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@base/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@base/ui/drawer';
import { Input } from '@base/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@base/ui/select';
import { Skeleton } from '@base/ui/skeleton';
import { Textarea } from '@base/ui/textarea';
import { type ColumnDef } from '@tanstack/react-table';
import { FileText, Search, Trash2, Upload } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';

import { useIsMobile } from '@base/ui';
import { toast } from 'sonner';

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  completed: 'default',
  processing: 'secondary',
  pending: 'outline',
  failed: 'destructive',
};

const STATUS_LABELS: Record<string, string> = {
  completed: '已完成',
  processing: '处理中',
  pending: '等待中',
  failed: '失败',
};

function statusBadge(status: string) {
  return (
    <Badge variant={STATUS_VARIANTS[status] || 'outline'}>{STATUS_LABELS[status] || status}</Badge>
  );
}

export default function KnowledgeBaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: kb, isLoading } = useKnowledgeBase(id);
  const { data: documents, refetch: refetchDocs } = useDocuments(id);
  const deleteDoc = useDeleteDocument();
  const retrieval = useRetrieval();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [retrievalResults, setRetrievalResults] = useState<
    { content: string; metadata: Record<string, any>; score?: number }[] | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; fileName: string } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const isMobile = useIsMobile();

  const fileTypes = useMemo(() => {
    if (!documents) return [];
    return [...new Set(documents.map((d) => d.fileType))].sort((a, b) => a.localeCompare(b));
  }, [documents]);

  const columns: ColumnDef<Document>[] = useMemo(
    () => [
      {
        accessorKey: 'fileName',
        header: '文件名',
        cell: ({ row }) => (
          <div className='flex items-center gap-2 font-medium'>
            <FileText className='size-4 text-muted-foreground' />
            {row.original.fileName}
          </div>
        ),
      },
      {
        accessorKey: 'fileType',
        header: '类型',
        cell: ({ row }) => row.original.fileType,
        filterFn: 'equals',
      },
      {
        accessorKey: 'fileSize',
        header: '大小',
        cell: ({ row }) => `${(row.original.fileSize / 1024).toFixed(1)} KB`,
      },
      {
        accessorKey: 'status',
        header: '状态',
        cell: ({ row }) => statusBadge(row.original.status),
      },
      {
        id: 'actions',
        header: '操作',
        cell: ({ row }) => (
          <Button
            variant='ghost'
            size='icon'
            onClick={() => {
              setDeleteTarget({ id: row.original.id, fileName: row.original.fileName });
              setDeleteDialogOpen(true);
            }}
          >
            <Trash2 className='size-4' />
          </Button>
        ),
      },
    ],
    []
  );

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const fileArray = Array.from(files);
    let successCount = 0;
    let failCount = 0;

    await Promise.all(
      fileArray.map(async (file) => {
        try {
          await apiUpload(`/knowledge/${id}/documents/upload`, file);
          successCount++;
        } catch {
          failCount++;
        }
      })
    );

    if (failCount === 0) {
      toast.success(`${successCount} 个文档已上传，开始处理`);
    } else {
      toast.error(`${successCount} 个上传成功，${failCount} 个失败`);
    }

    await refetchDocs();
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteDoc = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc.mutateAsync({ knowledgeBaseId: id, documentId: deleteTarget.id });
      toast.success('文档已删除');
      await refetchDocs();
      setDeleteDialogOpen(false);
      setTimeout(() => setDeleteTarget(null), 200);
    } catch {
      toast.error('删除失败');
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    try {
      const results = await retrieval.mutateAsync({ knowledgeBaseId: id, query });
      setRetrievalResults(results);
    } catch {
      toast.error('检索失败');
    }
  };

  if (isLoading) {
    return (
      <FadeIn direction='up'>
        <div className='flex flex-col gap-6'>
          <Skeleton className='h-8 w-48' />
          <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
            <div className='flex flex-col gap-4 lg:col-span-2'>
              <Card>
                <CardHeader>
                  <Skeleton className='h-5 w-24' />
                </CardHeader>
                <CardContent className='flex flex-col gap-3'>
                  <Skeleton className='h-10 w-full' />
                  <Skeleton className='h-10 w-full' />
                  <Skeleton className='h-10 w-full' />
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardHeader>
                <Skeleton className='h-5 w-24' />
              </CardHeader>
              <CardContent className='flex flex-col gap-3'>
                <Skeleton className='h-20 w-full' />
                <Skeleton className='h-8 w-full' />
              </CardContent>
            </Card>
          </div>
        </div>
      </FadeIn>
    );
  }

  if (!kb) {
    return <p className='text-muted-foreground'>知识库未找到</p>;
  }

  return (
    <FadeIn direction='up'>
      <div className='flex flex-col gap-6'>
        <div className='flex items-center justify-between'>
          <div className='w-full'>
            <div className='flex items-center justify-between'>
              <h2 className='text-2xl font-bold'>{kb.name}</h2>
              <Drawer
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
                swipeDirection={isMobile ? 'down' : 'right'}
              >
                <DrawerTrigger
                  render={
                    <Button variant='outline'>
                      <Search data-icon />
                      检索测试
                    </Button>
                  }
                />
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>检索测试</DrawerTitle>
                    <DrawerDescription>输入查询内容进行相似度检索</DrawerDescription>
                  </DrawerHeader>
                  <div className='flex-1 overflow-y-auto p-4'>
                    <div className='flex flex-col gap-3'>
                      <Textarea
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder='输入查询内容...'
                        rows={3}
                      />
                      <Button
                        className='w-full'
                        onClick={handleSearch}
                        disabled={retrieval.isPending}
                      >
                        <Search data-icon />
                        {retrieval.isPending ? '检索中...' : '检索'}
                      </Button>

                      {retrievalResults && (
                        <div className='flex flex-col gap-3'>
                          <p className='text-sm font-medium'>
                            检索结果 ({retrievalResults.length})
                          </p>
                          {retrievalResults.map((r, i) => (
                            <div key={i} className='rounded-lg border p-3 text-sm'>
                              {r.score !== undefined && (
                                <p className='mb-1 text-xs text-muted-foreground'>
                                  相似度: {(r.score * 100).toFixed(1)}%
                                </p>
                              )}
                              <p className='line-clamp-4'>{r.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <DrawerFooter>
                    <Button variant='outline' onClick={() => setDrawerOpen(false)}>
                      关闭
                    </Button>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            </div>
            {kb.description && <p className='text-sm text-muted-foreground'>{kb.description}</p>}
            <p className='mt-1 text-xs text-muted-foreground'>嵌入模型: {kb.embeddingModel}</p>
          </div>
        </div>

        {/* Documents section */}
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <CardTitle className='text-lg'>文档</CardTitle>
              <div>
                <input
                  type='file'
                  ref={fileInputRef}
                  className='hidden'
                  accept='.pdf,.txt,.md,.html'
                  multiple
                  onChange={handleUpload}
                />
                <Button
                  size='sm'
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload data-icon />
                  {uploading ? '上传中...' : '上传文档'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!documents || documents.length === 0 ? (
              <p className='text-sm text-muted-foreground'>暂无文档</p>
            ) : (
              <DataTable
                columns={columns}
                data={documents}
                toolbar={(table) => (
                  <div className='flex items-center gap-2'>
                    <Input
                      placeholder='搜索文件名...'
                      value={(table.getColumn('fileName')?.getFilterValue() as string) ?? ''}
                      onChange={(e) => table.getColumn('fileName')?.setFilterValue(e.target.value)}
                      className='h-8 max-w-60'
                    />
                    <Select
                      value={(table.getColumn('fileType')?.getFilterValue() as string) ?? ''}
                      onValueChange={(value) =>
                        table
                          .getColumn('fileType')
                          ?.setFilterValue(value === '__all__' ? '' : value)
                      }
                    >
                      <SelectTrigger className='h-8 w-32'>
                        <SelectValue placeholder='全部类型' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='__all__'>全部类型</SelectItem>
                        {fileTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Delete document dialog */}
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
                确定要删除文档 &ldquo;{deleteTarget?.fileName}&rdquo; 吗？此操作不可撤销。
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
              <Button
                variant='destructive'
                disabled={deleteDoc.isPending}
                onClick={handleDeleteDoc}
              >
                {deleteDoc.isPending ? '删除中...' : '确认删除'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </FadeIn>
  );
}
