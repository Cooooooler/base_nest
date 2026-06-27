'use client';

import { apiUpload } from '@/api/client';
import { Badge } from '@/components/ui/badge';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  useDeleteDocument,
  useDocuments,
  useKnowledgeBase,
  useRetrieval,
} from '@/hooks/use-knowledge';
import { FileText, Search, Trash2, Upload } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

export default function KnowledgeBaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: kb, isLoading } = useKnowledgeBase(id);
  const { data: documents, refetch: refetchDocs } = useDocuments(id);
  const deleteDoc = useDeleteDocument();
  const retrieval = useRetrieval();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState('');
  const [retrievalResults, setRetrievalResults] = useState<
    { content: string; metadata: Record<string, any>; score?: number }[] | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; fileName: string } | null>(null);

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
      setDeleteTarget(null);
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

  const statusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      completed: 'default',
      processing: 'secondary',
      pending: 'outline',
      failed: 'destructive',
    };
    const labels: Record<string, string> = {
      completed: '已完成',
      processing: '处理中',
      pending: '等待中',
      failed: '失败',
    };
    return <Badge variant={variants[status] || 'outline'}>{labels[status] || status}</Badge>;
  };

  if (isLoading) {
    return (
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
    );
  }

  if (!kb) {
    return <p className='text-muted-foreground'>知识库未找到</p>;
  }

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h2 className='text-2xl font-bold'>{kb.name}</h2>
        {kb.description && <p className='text-sm text-muted-foreground'>{kb.description}</p>}
        <p className='mt-1 text-xs text-muted-foreground'>嵌入模型: {kb.embeddingModel}</p>
      </div>

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
        {/* Documents section */}
        <div className='flex flex-col gap-4 lg:col-span-2'>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>文件名</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>大小</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className='font-medium'>
                          <div className='flex items-center gap-2'>
                            <FileText className='size-4 text-muted-foreground' />
                            {doc.fileName}
                          </div>
                        </TableCell>
                        <TableCell>{doc.fileType}</TableCell>
                        <TableCell>{(doc.fileSize / 1024).toFixed(1)} KB</TableCell>
                        <TableCell>{statusBadge(doc.status)}</TableCell>
                        <TableCell>
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => setDeleteTarget({ id: doc.id, fileName: doc.fileName })}
                          >
                            <Trash2 className='size-4' />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Retrieval section */}
        <div className='flex flex-col gap-4'>
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>检索测试</CardTitle>
            </CardHeader>
            <CardContent className='flex flex-col gap-3'>
              <label htmlFor='retrieval-query' className='sr-only'>
                检索查询
              </label>
              <Textarea
                id='retrieval-query'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='输入查询内容...'
                rows={3}
              />
              <Button className='w-full' onClick={handleSearch} disabled={retrieval.isPending}>
                <Search data-icon />
                {retrieval.isPending ? '检索中...' : '检索'}
              </Button>

              {retrievalResults && (
                <div className='flex flex-col gap-3'>
                  <p className='text-sm font-medium'>检索结果 ({retrievalResults.length})</p>
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
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete document dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除文档 &ldquo;{deleteTarget?.fileName}&rdquo; 吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDeleteTarget(null)}>
              取消
            </Button>
            <Button variant='destructive' disabled={deleteDoc.isPending} onClick={handleDeleteDoc}>
              {deleteDoc.isPending ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
