'use client';

import { Providers } from '@/components/app/providers';
import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Providers>
      <div className='w-full h-full relative bg-linear-to-br from-background via-background to-muted/50'>
        {children}
      </div>
    </Providers>
  );
}
