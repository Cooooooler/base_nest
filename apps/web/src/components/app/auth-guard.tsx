'use client';

import { useAuthStore } from '@/store/auth-store';
import { useMount } from 'ahooks';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const publicPaths = new Set(['/login', '/register']);

export function AuthGuard({ children }: Readonly<{ children: React.ReactNode }>) {
  const [hydrated, setHydrated] = useState(false);
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const pathname = usePathname();

  useMount(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }

    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  });

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken && !publicPaths.has(pathname)) {
      router.replace('/login');
    }
    if (accessToken && publicPaths.has(pathname)) {
      router.replace('/');
    }
  }, [hydrated, accessToken, pathname, router]);

  if (!hydrated) return null;
  if (!accessToken && !publicPaths.has(pathname)) return null;

  return <>{children}</>;
}
