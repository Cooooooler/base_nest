'use client';

import { FadeIn } from '@/components/animated/fade-in';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useCreateApp } from '@/hooks/use-chat';
import { useKnowledgeBases } from '@/hooks/use-knowledge';
import { useProviderModels, useProviders } from '@/hooks/use-providers';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

const formSchema = z.object({
  name: z.string().min(1, '请填写应用名称'),
  description: z.string().optional(),
  providerId: z.string().min(1, '请选择模型提供商'),
  modelId: z.string().min(1, '请选择模型'),
  systemPrompt: z.string().optional(),
  temperature: z.coerce.number().min(0).max(2),
  knowledgeBaseId: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function NewAppPage() {
  const router = useRouter();
  const createApp = useCreateApp();
  const { data: providers } = useProviders();
  const { data: knowledgeBases } = useKnowledgeBases();

  const {
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      providerId: '',
      modelId: '',
      systemPrompt: '',
      temperature: 0.7,
      knowledgeBaseId: '',
    },
  });

  const selectedProviderId = useWatch({
    control,
    name: 'providerId',
  });

  const { data: models } = useProviderModels(selectedProviderId);

  const providerOptions = providers?.map((p) => ({ value: p.id, label: p.name })) ?? [];

  const modelOptions = models?.map((m) => ({ value: m.id, label: m.displayName || m.name })) ?? [];

  const knowledgeBaseOptions =
    knowledgeBases?.map((kb) => ({ value: kb.id, label: kb.name })) ?? [];

  const selectedTemperature = useWatch({
    control,
    name: 'temperature',
  });

  const onSubmit = async (data: FormData) => {
    try {
      const app = await createApp.mutateAsync({
        name: data.name,
        description: data.description || undefined,
        providerId: data.providerId,
        modelId: data.modelId,
        systemPrompt: data.systemPrompt || '',
        temperature: data.temperature,
        maxTokens: 4096,
        knowledgeBaseId: data.knowledgeBaseId || undefined,
      });
      toast.success('应用已创建');
      router.push(`/apps/${app.id}/chat`);
    } catch {
      toast.error('创建失败');
    }
  };

  return (
    <div className='mx-auto max-w-2xl'>
      <FadeIn direction='up'>
        <Card>
          <CardHeader>
            <CardTitle>新建对话应用</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className='flex flex-col gap-4'>
              <Controller
                name='name'
                control={control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor='app-name' required>
                      名称
                    </FieldLabel>
                    <Input
                      {...field}
                      id='app-name'
                      placeholder='智能客服'
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
                    <FieldLabel htmlFor='app-description'>描述</FieldLabel>
                    <Textarea {...field} id='app-description' placeholder='应用描述（可选）' />
                  </Field>
                )}
              />

              <Controller
                name='providerId'
                control={control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor='app-provider' required>
                      模型提供商
                    </FieldLabel>
                    <Combobox
                      items={providerOptions}
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v);
                        setValue('modelId', '');
                      }}
                      itemToStringLabel={(item) =>
                        providerOptions.find((o) => o.value === item)?.label ?? item
                      }
                    >
                      <ComboboxInput id={'app-provider'} placeholder='选择提供商' />
                      <ComboboxContent>
                        <ComboboxEmpty>未找到提供商</ComboboxEmpty>
                        <ComboboxList>
                          {(item) => (
                            <ComboboxItem key={item.value} value={item.value}>
                              {item.label}
                            </ComboboxItem>
                          )}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                    {fieldState.invalid && (
                      <p className='text-sm text-destructive'>{fieldState.error?.message}</p>
                    )}
                  </Field>
                )}
              />

              <Controller
                name='modelId'
                control={control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor='app-model' required>
                      模型
                    </FieldLabel>
                    <Combobox
                      items={modelOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!selectedProviderId}
                      itemToStringLabel={(item) =>
                        modelOptions.find((o) => o.value === item)?.label ?? item
                      }
                    >
                      <ComboboxInput
                        disabled={!selectedProviderId}
                        id={'app-model'}
                        placeholder={selectedProviderId ? '选择模型' : '请先选择提供商'}
                      />
                      <ComboboxContent>
                        <ComboboxEmpty>未找到模型</ComboboxEmpty>
                        <ComboboxList>
                          {(item) => (
                            <ComboboxItem key={item.value} value={item.value}>
                              {item.label}
                            </ComboboxItem>
                          )}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                    {fieldState.invalid && (
                      <p className='text-sm text-destructive'>{fieldState.error?.message}</p>
                    )}
                  </Field>
                )}
              />

              <Controller
                name='systemPrompt'
                control={control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor='app-system-prompt'>系统提示词</FieldLabel>
                    <Textarea
                      {...field}
                      id='app-system-prompt'
                      placeholder='你是一个智能助手。用户问题：{{query}}'
                      rows={4}
                    />
                    <p className='text-xs text-muted-foreground'>
                      支持 &#123;&#123;query&#125;&#125;、&#123;&#123;date&#125;&#125; 变量
                    </p>
                  </Field>
                )}
              />

              <Controller
                name='temperature'
                control={control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>温度 ({selectedTemperature})</FieldLabel>
                    <Slider
                      min={0}
                      max={2}
                      step={0.1}
                      value={[field.value]}
                      onValueChange={(values) =>
                        field.onChange(Array.isArray(values) ? values[0] : values)
                      }
                    />
                  </Field>
                )}
              />

              <Controller
                name='knowledgeBaseId'
                control={control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor='app-knowledge-base'>关联知识库（可选）</FieldLabel>
                    <Combobox
                      id={'app-knowledge-base'}
                      items={knowledgeBaseOptions}
                      value={field.value ?? ''}
                      onValueChange={field.onChange}
                      itemToStringLabel={(item) =>
                        knowledgeBaseOptions.find((o) => o.value === item)?.label ?? item
                      }
                    >
                      <ComboboxInput placeholder='不关联知识库' />
                      <ComboboxContent>
                        <ComboboxEmpty>未找到知识库</ComboboxEmpty>
                        <ComboboxList>
                          {(item) => (
                            <ComboboxItem key={item.value} value={item.value}>
                              {item.label}
                            </ComboboxItem>
                          )}
                        </ComboboxList>
                      </ComboboxContent>
                    </Combobox>
                  </Field>
                )}
              />

              <div className='flex justify-end gap-3'>
                <Button type='submit' disabled={isSubmitting}>
                  {isSubmitting && <Spinner data-icon='inline-start' />}
                  {isSubmitting ? '创建中...' : '创建'}
                </Button>
                <Button variant='outline' type='button' onClick={() => router.back()}>
                  取消
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
