import { cn } from './utils';

describe('cn', () => {
  it('合并多个 class 字符串', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('忽略 false 条件', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c');
  });

  it('忽略 undefined 和 null', () => {
    expect(cn('a', undefined, null)).toBe('a');
  });

  it('合并 tailwind 冲突 class（保留后者）', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('处理空参数', () => {
    expect(cn()).toBe('');
  });
});
