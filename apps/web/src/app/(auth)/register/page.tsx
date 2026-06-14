'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import type { RegisterResponse } from '@base/shared';
import { Bot } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export default function RegisterPage() {
  const router = useRouter();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email || !name || !password) {
        toast.error('请填写所有字段');
        return;
      }
      setIsPending(true);
      try {
        const data = await apiClient<RegisterResponse>('/auth/register', {
          method: 'POST',
          json: { email, name, password },
        });
        setTokens(data.accessToken, data.refreshToken);
        setUser(data.user);
        toast.success('注册成功');
        router.push('/');
      } catch {
        toast.error('注册失败，请检查信息');
      }
      setIsPending(false);
    },
    [email, name, password, router, setTokens, setUser]
  );

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
          <form onSubmit={handleSubmit} className='space-y-4'>
            <fieldset className='space-y-2' disabled={isPending}>
              <label className='text-sm font-medium' htmlFor='name'>
                用户名
              </label>
              <Input
                id='name'
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='Alice'
                autoComplete='name'
                required
              />
            </fieldset>
            <fieldset className='space-y-2' disabled={isPending}>
              <label className='text-sm font-medium' htmlFor='email'>
                邮箱
              </label>
              <Input
                id='email'
                type='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='alice@example.com'
                autoComplete='email'
                required
              />
            </fieldset>
            <fieldset className='space-y-2' disabled={isPending}>
              <label className='text-sm font-medium' htmlFor='password'>
                密码
              </label>
              <Input
                id='password'
                type='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder='最少 6 位'
                autoComplete='new-password'
                required
                minLength={6}
              />
            </fieldset>
            <Button type='submit' className='w-full' disabled={isPending}>
              {isPending ? '注册中…' : '注册'}
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
