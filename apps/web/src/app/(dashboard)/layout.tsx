'use client';

import { Providers } from '@/components/app/providers';
import { AppSidebar } from '@/components/app/app-sidebar';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { usePathname } from 'next/navigation';

const routeTitles: Record<string, string> = {
  '/': '仪表盘',
  '/providers': '模型提供商',
  '/knowledge': '知识库',
  '/apps': '对话应用',
  '/workflows': '工作流',
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const title = Object.entries(routeTitles).find(([key]) =>
    pathname.startsWith(key)
  )?.[1] || 'Base Nest AI';

  return (
    <Providers>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-lg font-semibold">{title}</h1>
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </SidebarInset>
    </Providers>
  );
}
