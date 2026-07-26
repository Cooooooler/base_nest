'use client';

import { login } from '@/api/auth';
import { FadeIn } from '@/components/animated/fade-in';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@base/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@base/ui/card';
import { Field, FieldLabel } from '@base/ui/field';
import { Input } from '@base/ui/input';
import { Spinner } from '@base/ui/spinner';
import { zodResolver } from '@hookform/resolvers/zod';
import { Bot } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

const formSchema = z.object({
  email: z.string().min(1, '请填写邮箱').email('邮箱格式不正确'),
  password: z.string().min(1, '请填写密码').min(6, '密码至少需要6个字符'),
});

type FormData = z.infer<typeof formSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const result = await login(data.email, data.password);
      setTokens(result.accessToken, result.refreshToken);
      setUser(result.user);
      toast.success('登录成功');
      router.push('/');
    } catch {
      toast.error('邮箱或密码错误');
    }
  };

  return (
    <div className='flex min-h-screen items-center justify-center p-4'>
      <FadeIn direction='up'>
        <Card className='min-w-96'>
          <CardHeader className='space-y-1 text-center'>
            <div className='mb-2 flex justify-center'>
              <div className='flex size-10 items-center justify-center rounded-lg bg-primary'>
                <Bot className='size-5 text-primary-foreground' />
              </div>
            </div>
            <CardTitle className='text-xl'>登录</CardTitle>
            <CardDescription>登录到 Base Nest AI 平台</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
              <Controller
                name='email'
                control={control}
                render={({ field, fieldState }) => (
                  <Field>
                    <FieldLabel htmlFor='email' required>
                      邮箱
                    </FieldLabel>
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
                    <FieldLabel htmlFor='password' required>
                      密码
                    </FieldLabel>
                    <Input
                      {...field}
                      id='password'
                      type='password'
                      placeholder='输入密码'
                      autoComplete='current-password'
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
                登录
              </Button>
            </form>
          </CardContent>
          <CardFooter className='justify-center'>
            <p className='text-sm text-muted-foreground'>
              还没有账号？{' '}
              <Link href='/register' className='font-medium text-primary hover:underline'>
                注册
              </Link>
            </p>
          </CardFooter>
        </Card>
      </FadeIn>
    </div>
  );
}
