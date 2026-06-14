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
import type { LoginResponse } from '@base/shared';
import { Bot } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email || !password) {
        toast.error('请填写邮箱和密码');
        return;
      }
      setIsPending(true);
      try {
        const data = await apiClient<LoginResponse>('/auth/login', {
          method: 'POST',
          json: { email, password },
        });
        setTokens(data.accessToken, data.refreshToken);
        setUser(data.user);
        toast.success('登录成功');
        router.push('/');
      } catch {
        toast.error('邮箱或密码错误');
      }
      setIsPending(false);
    },
    [email, password, router, setTokens, setUser]
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
          <CardTitle className='text-xl'>登录</CardTitle>
          <CardDescription>登录到 Base Nest AI 平台</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className='space-y-4'>
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
              <div className='flex items-center justify-between'>
                <label className='text-sm font-medium' htmlFor='password'>
                  密码
                </label>
              </div>
              <Input
                id='password'
                type='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder='输入密码'
                autoComplete='current-password'
                required
              />
            </fieldset>
            <Button type='submit' className='w-full' disabled={isPending}>
              {isPending ? '登录中…' : '登录'}
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
    </div>
  );
}
