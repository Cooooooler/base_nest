'use client';

import { Providers } from '@/components/app/providers';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className='relative min-h-screen bg-gradient-to-br from-background via-background to-muted/50'>
        <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.05),transparent_50%)]' />
        <div className='absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(var(--primary)/0.03),transparent_50%)]' />
        {children}
      </div>
    </Providers>
  );
}
