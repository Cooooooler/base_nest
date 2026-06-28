'use client';

import { register } from '@/api/auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useAuthStore } from '@/store/auth-store';
import { zodResolver } from '@hookform/resolvers/zod';
import { Bot } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

const formSchema = z.object({
  name: z.string().min(1, '请填写用户名'),
  email: z.string().min(1, '请填写邮箱').email('邮箱格式不正确'),
  password: z.string().min(1, '请填写密码').min(6, '密码至少需要6个字符'),
});

type FormData = z.infer<typeof formSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const result = await register(data.email, data.name, data.password);
      setTokens(result.accessToken, result.refreshToken);
      setUser(result.user);
      toast.success('注册成功');
      router.push('/');
    } catch {
      toast.error('注册失败，请检查信息');
    }
  };

  return (
    <div className='flex min-h-screen items-center justify-center p-4'>
      <Card className='w-full max-w-sm'>
        <CardHeader className='space-y-1 text-center'>
          <div className='mb-2 flex justify-center'>
            <div className='flex size-10 items-center justify-center rounded-lg bg-primary'>
              <Bot className='size-5 text-primary-foreground' />
            </div>
          </div>
          <CardTitle className='text-xl'>注册</CardTitle>
          <CardDescription>创建你的 Base Nest AI 账号</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
            <Controller
              name='name'
              control={control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel htmlFor='name'>用户名</FieldLabel>
                  <Input
                    {...field}
                    id='name'
                    placeholder='Alice'
                    autoComplete='name'
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <p className='text-sm text-destructive'>{fieldState.error?.message}</p>
                  )}
                </Field>
              )}
            />
            <Controller
              name='email'
              control={control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel htmlFor='email'>邮箱</FieldLabel>
                  <Input
                    {...field}
                    id='email'
                    type='email'
                    placeholder='alice@example.com'
                    autoComplete='email'
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <p className='text-sm text-destructive'>{fieldState.error?.message}</p>
                  )}
                </Field>
              )}
            />
            <Controller
              name='password'
              control={control}
              render={({ field, fieldState }) => (
                <Field>
                  <FieldLabel htmlFor='password'>密码</FieldLabel>
                  <Input
                    {...field}
                    id='password'
                    type='password'
                    placeholder='最少 6 位'
                    autoComplete='new-password'
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <p className='text-sm text-destructive'>{fieldState.error?.message}</p>
                  )}
                </Field>
              )}
            />
            <Button type='submit' className='w-full' disabled={isSubmitting}>
              {isSubmitting && <Spinner data-icon='inline-start' />}
              注册
            </Button>
          </form>
        </CardContent>
        <CardFooter className='justify-center'>
          <p className='text-sm text-muted-foreground'>
            已有账号？{' '}
            <Link href='/login' className='font-medium text-primary hover:underline'>
              登录
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
