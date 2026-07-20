'use client';

import { logout as logoutApi } from '@/api/auth';
import { useAuthStore } from '@/store/auth-store';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@base/ui/sidebar';
import { useMemoizedFn } from 'ahooks';
import {
  BookOpen,
  Bot,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  Workflow,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { href: '/', label: '仪表盘', icon: LayoutDashboard },
  { href: '/providers', label: '模型提供商', icon: Bot },
  { href: '/knowledge', label: '知识库', icon: BookOpen },
  { href: '/apps', label: '对话应用', icon: MessageSquare },
  { href: '/workflows', label: '工作流', icon: Workflow },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const refreshToken = useAuthStore.getState().refreshToken;
    try {
      if (refreshToken) await logoutApi(refreshToken);
    } catch {
      // ignore logout API error
    }
    useAuthStore.getState().reset();
    router.push('/login');
  };

  const isActive = useMemoizedFn(
    (href: string) => pathname === href || pathname.startsWith(href + '/')
  );

  return (
    <Sidebar>
      <SidebarHeader>
        <div className='flex items-center gap-2 px-2 py-1'>
          <Bot className='size-6' />
          <span className='font-semibold text-base'>Base Nest AI</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>导航</SidebarGroupLabel>
          <SidebarMenu className='gap-2'>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  className='cursor-pointer transition-colors duration-150'
                  onClick={() => router.push(item.href)}
                  isActive={isActive(item.href)}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className='cursor-pointer' onClick={() => router.push('/settings')}>
              <Settings />
              <span>设置</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton className='cursor-pointer' onClick={handleLogout}>
              <LogOut />
              <span>退出登录</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
