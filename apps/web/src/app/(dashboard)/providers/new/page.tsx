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
import { useCreateProvider } from '@/hooks/use-providers';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

const formSchema = z.object({
  name: z.string().min(1, '请填写名称'),
  type: z.string().min(1, '请选择类型'),
  baseUrl: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

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

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', type: '', baseUrl: '' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await createProvider.mutateAsync({
        name: data.name,
        type: data.type as any,
        baseUrl: data.baseUrl || undefined,
      });
      toast.success('提供商已创建');
      router.push('/providers');
    } catch {
      toast.error('创建失败');
    }
  };

  return (
    <div className='mx-auto max-w-lg'>
      <FadeIn direction='up'>
        <Card>
          <CardHeader>
            <CardTitle>添加模型提供商</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
              <Controller
                name='name'
                control={control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor='provider-name' required>
                      名称
                    </FieldLabel>
                    <Input
                      {...field}
                      id='provider-name'
                      placeholder='OpenAI'
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <p className='text-sm text-destructive'>{fieldState.error?.message}</p>
                    )}
                  </Field>
                )}
              />
              <Controller
                name='type'
                control={control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor='provider-type' required>
                      类型
                    </FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id='provider-type' aria-invalid={fieldState.invalid}>
                        <SelectValue placeholder='选择类型' />
                      </SelectTrigger>
                      <SelectContent>
                        {providerTypes.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && (
                      <p className='text-sm text-destructive'>{fieldState.error?.message}</p>
                    )}
                  </Field>
                )}
              />
              <Controller
                name='baseUrl'
                control={control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor='provider-base-url'>API 端点（可选）</FieldLabel>
                    <Input
                      {...field}
                      id='provider-base-url'
                      placeholder='https://api.openai.com/v1'
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <p className='text-sm text-destructive'>{fieldState.error?.message}</p>
                    )}
                  </Field>
                )}
              />
              <div className='flex items-center justify-end gap-2'>
                <Button type='submit' disabled={isSubmitting}>
                  {isSubmitting && <Spinner data-icon='inline-start' />}
                  创建
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
