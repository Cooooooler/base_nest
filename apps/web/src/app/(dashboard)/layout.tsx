'use client';

import { AppSidebar } from '@/components/app/app-sidebar';
import { Button } from '@base/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@base/ui/dropdown-menu';
import { SidebarInset, SidebarTrigger } from '@base/ui/sidebar';
import { ArrowLeft, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { usePathname, useRouter } from 'next/navigation';

const routeTitles: Record<string, string> = {
  '/': '仪表盘',
  '/providers': '模型提供商',
  '/knowledge': '知识库',
  '/apps': '对话应用',
  '/workflows': '工作流',
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();

  const title =
    routeTitles[pathname] ||
    Object.entries(routeTitles).find(([key]) => key !== '/' && pathname.startsWith(key))?.[1] ||
    'Base Nest AI';

  const parentRoute = Object.keys(routeTitles).find(
    (key) => key !== '/' && pathname.startsWith(key + '/')
  );
  const showBack = !!parentRoute;

  const ThemeIcon = resolvedTheme === 'dark' ? Moon : Sun;

  return (
    <>
      <AppSidebar />
      <SidebarInset className='max-h-screen min-h-0 overflow-hidden'>
        <header className='flex h-16 shrink-0 items-center gap-2 border-b px-4'>
          <SidebarTrigger className='-ml-1 cursor-pointer' />
          <h1 className='text-lg font-semibold'>{title}</h1>
          <div className='ml-auto flex items-center gap-2'>
            <DropdownMenu>
              <DropdownMenuTrigger
                className='cursor-pointer'
                render={<Button variant='ghost' size='icon' />}
              >
                <ThemeIcon className='size-4' />
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end'>
                <DropdownMenuItem className='cursor-pointer' onClick={() => setTheme('light')}>
                  <Sun className='size-4' />
                  浅色
                </DropdownMenuItem>
                <DropdownMenuItem className='cursor-pointer' onClick={() => setTheme('dark')}>
                  <Moon className='size-4' />
                  深色
                </DropdownMenuItem>
                <DropdownMenuItem className='cursor-pointer' onClick={() => setTheme('system')}>
                  <Monitor className='size-4' />
                  系统
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {showBack && (
              <Button variant='outline' size='sm' onClick={() => router.push(parentRoute)}>
                <ArrowLeft data-icon='inline-start' />
                返回
              </Button>
            )}
          </div>
        </header>
        <main className='flex-1 p-6 animate-fade-in-up flex flex-col min-h-0'>{children}</main>
      </SidebarInset>
    </>
  );
}
