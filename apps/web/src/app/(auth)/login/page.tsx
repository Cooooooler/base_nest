'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import type { LoginResponse } from '@base/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
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
    setLoading(false);
  };

  return (
    <Card className='w-full max-w-sm'>
      <CardHeader className='text-center'>
        <CardTitle className='text-2xl'>登录</CardTitle>
        <CardDescription>登录到 Base Nest AI 平台</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-2'>
            <label className='text-sm font-medium'>邮箱</label>
            <Input
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='alice@example.com'
              required
            />
          </div>
          <div className='space-y-2'>
            <label className='text-sm font-medium'>密码</label>
            <Input
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder='******'
              required
            />
          </div>
          <Button type='submit' className='w-full' disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </Button>
          <p className='text-center text-sm text-muted-foreground'>
            还没有账号？{' '}
            <Link href='/register' className='text-primary hover:underline'>
              注册
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
