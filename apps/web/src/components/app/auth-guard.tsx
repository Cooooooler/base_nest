'use client';

import { useAuthStore } from '@/store/auth-store';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

const publicPaths = ['/login', '/register'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!accessToken && !publicPaths.includes(pathname)) {
      router.replace('/login');
    }
    if (accessToken && publicPaths.includes(pathname)) {
      router.replace('/');
    }
  }, [accessToken, pathname, router]);

  if (!accessToken && !publicPaths.includes(pathname)) {
    return null;
  }

  return <>{children}</>;
}
