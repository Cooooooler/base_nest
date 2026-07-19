import { useSidebarStore } from './sidebar-store';

beforeEach(() => {
  useSidebarStore.setState({ isOpen: true });
});

describe('SidebarStore', () => {
  it('初始状态 isOpen 为 true', () => {
    expect(useSidebarStore.getState().isOpen).toBe(true);
  });

  it('toggle 翻转 isOpen', () => {
    useSidebarStore.getState().toggle();
    expect(useSidebarStore.getState().isOpen).toBe(false);
    useSidebarStore.getState().toggle();
    expect(useSidebarStore.getState().isOpen).toBe(true);
  });

  it('setOpen 设置指定状态', () => {
    useSidebarStore.getState().setOpen(false);
    expect(useSidebarStore.getState().isOpen).toBe(false);
    useSidebarStore.getState().setOpen(true);
    expect(useSidebarStore.getState().isOpen).toBe(true);
  });
});
