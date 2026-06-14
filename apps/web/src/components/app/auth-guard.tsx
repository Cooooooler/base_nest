'use client';

import { useAuthStore } from '@/store/auth-store';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const publicPaths = ['/login', '/register'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken && !publicPaths.includes(pathname)) {
      router.replace('/login');
    }
    if (accessToken && publicPaths.includes(pathname)) {
      router.replace('/');
    }
  }, [hydrated, accessToken, pathname, router]);

  if (!hydrated) return null;
  if (!accessToken && !publicPaths.includes(pathname)) return null;

  return <>{children}</>;
}
