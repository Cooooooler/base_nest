'use client';

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
  DialogTrigger,
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
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useCreateApiKey,
  useCreateModel,
  useDeleteApiKey,
  useDeleteModel,
  usePresetModels,
  useProvider,
  useProviderApiKeys,
  useProviderModels,
  useUpdateModel,
} from '@/hooks/use-providers';
import type { PresetModel } from '@base/shared';
import { LOCAL_PROVIDER_TYPES } from '@base/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemoizedFn } from 'ahooks';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

const keyFormSchema = z.object({
  name: z.string().min(1, '请输入密钥名称'),
  apiKey: z.string().min(1, '请输入 API 密钥'),
});

type KeyFormData = z.infer<typeof keyFormSchema>;

export default function ProviderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: provider, isLoading } = useProvider(id);
  const { data: apiKeys, refetch: refetchKeys } = useProviderApiKeys(id);
  const createApiKey = useCreateApiKey();
  const deleteApiKey = useDeleteApiKey();

  const { data: models, isLoading: isModelsLoading } = useProviderModels(id);
  const { data: presetModels } = usePresetModels(provider?.type ?? '');
  const createModel = useCreateModel();
  const updateModel = useUpdateModel();
  const deleteModel = useDeleteModel();

  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<any>(null);
  const [deleteModelTarget, setDeleteModelTarget] = useState<{ id: string; name: string } | null>(
    null
  );
  const [selectedPreset, setSelectedPreset] = useState('');
  const [modelCapabilities, setModelCapabilities] = useState<Record<string, boolean>>({});

  const modelFormSchema = z.object({
    name: z.string().min(1, '请输入模型标识名'),
    displayName: z.string().min(1, '请输入展示名'),
    contextWindow: z.number().optional(),
    maxOutput: z.number().optional(),
  });

  type ModelFormData = z.infer<typeof modelFormSchema>;

  const {
    control: modelControl,
    handleSubmit: handleModelSubmit,
    reset: resetModelForm,
    setValue: setModelValue,
    formState: { isSubmitting: modelIsSubmitting },
  } = useForm<ModelFormData>({
    resolver: zodResolver(modelFormSchema),
    defaultValues: { name: '', displayName: '', contextWindow: undefined, maxOutput: undefined },
  });

  const handlePresetChange = useMemoizedFn((value: string) => {
    setSelectedPreset(value);
    const preset = presetModels?.find((pm: PresetModel) => pm.name === value);
    if (preset) {
      setModelValue('name', preset.name);
      setModelValue('displayName', preset.displayName);
      setModelValue('contextWindow', preset.contextWindow);
      setModelValue('maxOutput', preset.maxOutput);
      setModelCapabilities({ ...preset.capabilities });
    }
  });

  const handleEditModel = useMemoizedFn((model: any) => {
    setEditingModel(model);
    setModelValue('name', model.name);
    setModelValue('displayName', model.displayName);
    setModelValue('contextWindow', model.contextWindow || undefined);
    setModelValue('maxOutput', model.maxOutput || undefined);
    setModelCapabilities(model.capabilities || {});
    setModelDialogOpen(true);
  });

  const onModelSubmit = async (data: ModelFormData) => {
    try {
      if (editingModel) {
        await updateModel.mutateAsync({
          providerId: id,
          modelId: editingModel.id,
          ...data,
          capabilities: modelCapabilities,
        });
        toast.success('模型已更新');
      } else {
        await createModel.mutateAsync({
          providerId: id,
          ...data,
          capabilities: modelCapabilities,
        });
        toast.success('模型已创建');
      }
      setModelDialogOpen(false);
      setEditingModel(null);
      resetModelForm();
      setModelCapabilities({});
      setSelectedPreset('');
    } catch {
      toast.error(editingModel ? '更新失败' : '创建失败');
    }
  };

  const handleDeleteModel = async () => {
    if (!deleteModelTarget) return;
    try {
      await deleteModel.mutateAsync({ providerId: id, modelId: deleteModelTarget.id });
      toast.success('模型已删除');
      setDeleteModelTarget(null);
    } catch {
      toast.error('删除失败');
    }
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newKeyResult, setNewKeyResult] = useState<string | null>(null);
  const [deleteKeyTarget, setDeleteKeyTarget] = useState<{ id: string; name: string } | null>(null);

  const {
    control,
    handleSubmit,
    reset: resetForm,
    formState: { isSubmitting },
  } = useForm<KeyFormData>({
    resolver: zodResolver(keyFormSchema),
    defaultValues: { name: '', apiKey: '' },
  });

  const onSubmit = async (data: KeyFormData) => {
    try {
      const result = await createApiKey.mutateAsync({
        providerId: id,
        name: data.name,
        apiKey: data.apiKey,
      });
      setNewKeyResult(result.maskedKey);
      resetForm();
      await refetchKeys();
    } catch {
      toast.error('添加密钥失败');
    }
  };

  const handleDeleteKey = async () => {
    if (!deleteKeyTarget) return;
    try {
      await deleteApiKey.mutateAsync(deleteKeyTarget.id);
      toast.success('密钥已删除');
      setDeleteKeyTarget(null);
      await refetchKeys();
    } catch {
      toast.error('删除失败');
    }
  };

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <div className='flex items-center justify-between'>
          <Skeleton className='size-8' />
          <div className='flex-1' />
        </div>
        <div className='space-y-2'>
          <Skeleton className='h-9 w-48' />
          <Skeleton className='h-5 w-24' />
        </div>
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between'>
              <Skeleton className='h-6 w-24' />
              <Skeleton className='h-7 w-28' />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className='h-32 rounded-lg' />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className='flex flex-col items-center gap-4 py-16 text-center'>
        <p className='text-muted-foreground'>提供商未找到</p>
      </div>
    );
  }

  const isLocalProvider = LOCAL_PROVIDER_TYPES.includes(provider.type as any);

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <div className='flex items-center gap-2'>
            <h1 className='text-2xl font-bold tracking-tight'>{provider.name}</h1>
            <Badge variant='secondary'>{provider.type}</Badge>
            {provider.isEnabled && <Badge variant='default'>已启用</Badge>}
          </div>
          {provider.baseUrl && (
            <p className='mt-0.5 text-sm text-muted-foreground'>{provider.baseUrl}</p>
          )}
          {isLocalProvider && (
            <p className='mt-1 text-xs text-muted-foreground'>本地部署提供商，无需 API 密钥</p>
          )}
        </div>
      </div>

      {/* API Keys Section — 本地 provider 隐藏密钥管理功能 */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-lg'>API 密钥</CardTitle>
            {!isLocalProvider && (
              <Dialog
                open={dialogOpen}
                onOpenChange={(o) => {
                  setDialogOpen(o);
                  if (!o) {
                    setNewKeyResult(null);
                    resetForm();
                  }
                }}
              >
                <DialogTrigger render={<Button className='cursor-pointer' size='sm' />}>
                  <Plus data-icon='inline-start' />
                  添加密钥
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{newKeyResult ? '密钥已创建' : '添加 API 密钥'}</DialogTitle>
                  </DialogHeader>
                  {newKeyResult ? (
                    <div className='space-y-4'>
                      <p className='text-sm text-muted-foreground'>密钥已加密存储。显示值：</p>
                      <p className='font-mono text-lg'>{newKeyResult}</p>
                      <Button
                        className='cursor-pointer w-full'
                        onClick={() => {
                          setNewKeyResult(null);
                          setDialogOpen(false);
                        }}
                      >
                        完成
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
                      <Controller
                        name='name'
                        control={control}
                        render={({ field, fieldState }) => (
                          <Field>
                            <FieldLabel htmlFor='key-name'>密钥名称</FieldLabel>
                            <Input
                              {...field}
                              id='key-name'
                              placeholder='生产密钥'
                              aria-invalid={fieldState.invalid}
                            />
                            {fieldState.invalid && (
                              <p className='text-sm text-destructive'>
                                {fieldState.error?.message}
                              </p>
                            )}
                          </Field>
                        )}
                      />
                      <Controller
                        name='apiKey'
                        control={control}
                        render={({ field, fieldState }) => (
                          <Field>
                            <FieldLabel htmlFor='key-value'>API 密钥</FieldLabel>
                            <Input
                              {...field}
                              id='key-value'
                              placeholder='sk-...'
                              type='password'
                              aria-invalid={fieldState.invalid}
                            />
                            {fieldState.invalid && (
                              <p className='text-sm text-destructive'>
                                {fieldState.error?.message}
                              </p>
                            )}
                          </Field>
                        )}
                      />
                      <div className='flex items-center justify-end gap-2'>
                        <Button className='cursor-pointer' type='submit' disabled={isSubmitting}>
                          {isSubmitting && <Spinner data-icon='inline-start' />}
                          保存
                        </Button>
                        <Button
                          className='cursor-pointer'
                          type='button'
                          variant='outline'
                          onClick={() => {
                            setDialogOpen(false);
                            resetForm();
                          }}
                        >
                          取消
                        </Button>
                      </div>
                    </form>
                  )}
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLocalProvider ? (
            <p className='py-4 text-center text-sm text-muted-foreground'>
              本地提供商无需 API 密钥即可使用。
            </p>
          ) : !apiKeys || apiKeys.length === 0 ? (
            <p className='py-4 text-center text-sm text-muted-foreground'>
              暂无 API 密钥。点击上方按钮添加。
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>密钥</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className='w-16'>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className='font-medium'>{k.name}</TableCell>
                    <TableCell className='font-mono'>{k.maskedKey}</TableCell>
                    <TableCell>
                      {k.isActive ? (
                        <Badge variant='secondary'>启用</Badge>
                      ) : (
                        <Badge variant='outline'>禁用</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        className='cursor-pointer'
                        variant='ghost'
                        size='icon'
                        aria-label={`删除密钥 ${k.name}`}
                        onClick={() => setDeleteKeyTarget({ id: k.id, name: k.name })}
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

      {/* Models Section */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-lg'>模型</CardTitle>
            <Dialog
              open={modelDialogOpen}
              onOpenChange={(o) => {
                setModelDialogOpen(o);
                if (!o) {
                  setEditingModel(null);
                  resetModelForm();
                  setModelCapabilities({});
                  setSelectedPreset('');
                }
              }}
            >
              <DialogTrigger render={<Button className='cursor-pointer' size='sm' />}>
                <Plus data-icon='inline-start' />
                添加模型
              </DialogTrigger>
              <DialogContent className='sm:max-w-lg'>
                <DialogHeader>
                  <DialogTitle>{editingModel ? '编辑模型' : '添加模型'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleModelSubmit(onModelSubmit)} className='space-y-4'>
                  {!editingModel && presetModels && presetModels.length > 0 && (
                    <Field>
                      <FieldLabel>预设模型</FieldLabel>
                      <Select
                        value={selectedPreset}
                        onValueChange={(v) => v && handlePresetChange(v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder='选择一个预设模型（可选）' />
                        </SelectTrigger>
                        <SelectContent>
                          {presetModels.map((pm: PresetModel) => (
                            <SelectItem key={pm.name} value={pm.name}>
                              {pm.displayName} ({pm.name})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                  <Controller
                    name='name'
                    control={modelControl}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor='model-name'>模型标识名</FieldLabel>
                        <Input
                          {...field}
                          id='model-name'
                          placeholder='gpt-4o'
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && (
                          <p className='text-sm text-destructive'>{fieldState.error?.message}</p>
                        )}
                      </Field>
                    )}
                  />
                  <Controller
                    name='displayName'
                    control={modelControl}
                    render={({ field, fieldState }) => (
                      <Field>
                        <FieldLabel htmlFor='model-display-name'>展示名</FieldLabel>
                        <Input
                          {...field}
                          id='model-display-name'
                          placeholder='GPT-4o'
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && (
                          <p className='text-sm text-destructive'>{fieldState.error?.message}</p>
                        )}
                      </Field>
                    )}
                  />
                  <div className='grid grid-cols-2 gap-4'>
                    <Controller
                      name='contextWindow'
                      control={modelControl}
                      render={({ field }) => (
                        <Field>
                          <FieldLabel htmlFor='model-context'>上下文窗口</FieldLabel>
                          <Input
                            {...field}
                            id='model-context'
                            type='number'
                            placeholder='128000'
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(e.target.value ? Number(e.target.value) : undefined)
                            }
                          />
                        </Field>
                      )}
                    />
                    <Controller
                      name='maxOutput'
                      control={modelControl}
                      render={({ field }) => (
                        <Field>
                          <FieldLabel htmlFor='model-max-output'>最大输出</FieldLabel>
                          <Input
                            {...field}
                            id='model-max-output'
                            type='number'
                            placeholder='4096'
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange(e.target.value ? Number(e.target.value) : undefined)
                            }
                          />
                        </Field>
                      )}
                    />
                  </div>
                  <Field>
                    <FieldLabel>能力</FieldLabel>
                    <div className='flex flex-wrap gap-4'>
                      {['streaming', 'functionCalling', 'vision'].map((cap) => (
                        <label key={cap} className='flex items-center gap-2 text-sm'>
                          <input
                            type='checkbox'
                            checked={modelCapabilities[cap] ?? false}
                            onChange={(e) =>
                              setModelCapabilities((prev) => ({ ...prev, [cap]: e.target.checked }))
                            }
                            className='size-4 rounded border-gray-300'
                          />
                          {cap === 'functionCalling'
                            ? 'Function Calling'
                            : cap.charAt(0).toUpperCase() + cap.slice(1)}
                        </label>
                      ))}
                    </div>
                  </Field>
                  <DialogFooter>
                    <Button type='submit' disabled={modelIsSubmitting}>
                      {modelIsSubmitting && <Spinner data-icon='inline-start' />}
                      {editingModel ? '保存' : '创建'}
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={() => {
                        setModelDialogOpen(false);
                        setEditingModel(null);
                        resetModelForm();
                        setModelCapabilities({});
                        setSelectedPreset('');
                      }}
                    >
                      取消
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isModelsLoading ? (
            <div className='space-y-2'>
              <Skeleton className='h-8 w-full' />
              <Skeleton className='h-8 w-full' />
              <Skeleton className='h-8 w-full' />
            </div>
          ) : !models || models.length === 0 ? (
            <p className='py-4 text-center text-sm text-muted-foreground'>
              暂无模型。点击上方按钮添加。
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>标识</TableHead>
                  <TableHead>展示名</TableHead>
                  <TableHead>上下文</TableHead>
                  <TableHead>最大输出</TableHead>
                  <TableHead>能力</TableHead>
                  <TableHead className='w-20'>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className='font-mono text-xs'>{m.name}</TableCell>
                    <TableCell className='font-medium'>{m.displayName}</TableCell>
                    <TableCell className='text-sm text-muted-foreground'>
                      {m.contextWindow > 0 ? m.contextWindow.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className='text-sm text-muted-foreground'>
                      {m.maxOutput > 0 ? m.maxOutput.toLocaleString() : '-'}
                    </TableCell>
                    <TableCell>
                      <div className='flex flex-wrap gap-1'>
                        {Object.entries(m.capabilities || {})
                          .filter(([, v]) => v)
                          .map(([key]) => (
                            <Badge key={key} variant='outline' className='text-xs'>
                              {key}
                            </Badge>
                          ))}
                        {(!m.capabilities || Object.keys(m.capabilities).length === 0) && (
                          <span className='text-xs text-muted-foreground'>-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-1'>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='size-8'
                          aria-label={`编辑 ${m.displayName}`}
                          onClick={() => handleEditModel(m)}
                        >
                          <Pencil className='size-3.5' />
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='size-8'
                          aria-label={`删除 ${m.displayName}`}
                          onClick={() => setDeleteModelTarget({ id: m.id, name: m.displayName })}
                        >
                          <Trash2 className='size-3.5' />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Model Confirmation Dialog */}
      <Dialog
        open={!!deleteModelTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteModelTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除模型</DialogTitle>
            <DialogDescription>
              确定要删除模型 &ldquo;{deleteModelTarget?.name}&rdquo; 吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setDeleteModelTarget(null)}>
              取消
            </Button>
            <Button
              variant='destructive'
              onClick={handleDeleteModel}
              disabled={deleteModel.isPending}
            >
              {deleteModel.isPending ? '删除中…' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Key Confirmation Dialog */}
      <Dialog
        open={!!deleteKeyTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteKeyTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除 API 密钥</DialogTitle>
            <DialogDescription>
              确定要删除密钥 &ldquo;{deleteKeyTarget?.name}&rdquo;
              吗？此操作不可撤销，使用该密钥的应用将立即失效。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              className='cursor-pointer'
              variant='outline'
              onClick={() => setDeleteKeyTarget(null)}
            >
              取消
            </Button>
            <Button
              className='cursor-pointer'
              variant='destructive'
              onClick={handleDeleteKey}
              disabled={deleteApiKey.isPending}
            >
              {deleteApiKey.isPending ? '删除中…' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
