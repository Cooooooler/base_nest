'use client';

import { FadeIn } from '@/components/animated/fade-in';
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
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useCreateKnowledgeBase } from '@/hooks/use-knowledge';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

const EMBED_MODELS = [
  { value: 'mxbai-embed-large', label: 'mxbai-embed-large' },
  { value: 'bge-m3', label: 'bge-m3' },
];

const formSchema = z.object({
  name: z.string().min(1, '请输入知识库名称'),
  description: z.string().optional(),
  embeddingModel: z.string().min(1, '请选择嵌入模型'),
  chunkSize: z.coerce.number().min(1, '分块大小至少为 1'),
  chunkOverlap: z.coerce.number().min(0, '重叠不能为负数'),
});

type FormData = z.infer<typeof formSchema>;

export default function NewKnowledgeBasePage() {
  const router = useRouter();
  const createKb = useCreateKnowledgeBase();

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      embeddingModel: 'mxbai-embed-large',
      chunkSize: 500,
      chunkOverlap: 50,
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await createKb.mutateAsync({
        name: data.name,
        description: data.description || undefined,
        embeddingModel: data.embeddingModel,
        chunkSize: data.chunkSize,
        chunkOverlap: data.chunkOverlap,
      });
      toast.success('知识库已创建');
      router.push('/knowledge');
    } catch {
      toast.error('创建失败');
    }
  };

  return (
    <div className='mx-auto max-w-lg'>
      <FadeIn direction='up'>
        <Card>
          <CardHeader>
            <CardTitle>创建知识库</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-4'>
              <Controller
                name='name'
                control={control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor='kb-name' required>
                      名称
                    </FieldLabel>
                    <Input
                      {...field}
                      id='kb-name'
                      placeholder='产品文档库'
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
                    <FieldLabel htmlFor='kb-description'>描述</FieldLabel>
                    <Textarea {...field} id='kb-description' placeholder='知识库用途说明' />
                  </Field>
                )}
              />
              <Controller
                name='embeddingModel'
                control={control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor='kb-embed-model' required>
                      嵌入模型
                    </FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id='kb-embed-model'>
                        <SelectValue placeholder='选择嵌入模型' />
                      </SelectTrigger>
                      <SelectContent>
                        {EMBED_MODELS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
              <div className='grid grid-cols-2 gap-4'>
                <Controller
                  name='chunkSize'
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor='kb-chunk-size' required>
                        分块大小
                      </FieldLabel>
                      <Input
                        {...field}
                        id='kb-chunk-size'
                        type='number'
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <p className='text-sm text-destructive'>{fieldState.error?.message}</p>
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name='chunkOverlap'
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel htmlFor='kb-chunk-overlap' required>
                        分块重叠
                      </FieldLabel>
                      <Input
                        {...field}
                        id='kb-chunk-overlap'
                        type='number'
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <p className='text-sm text-destructive'>{fieldState.error?.message}</p>
                      )}
                    </Field>
                  )}
                />
              </div>
              <Button type='submit' disabled={isSubmitting}>
                {isSubmitting && <Spinner data-icon='inline-start' />}
                创建
              </Button>
            </form>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
