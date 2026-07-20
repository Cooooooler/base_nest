import { useResponsive } from 'ahooks';

/**
 * Returns true when the viewport width is less than the md breakpoint (768px).
 * Uses ahooks' useResponsive with built-in breakpoints.
 */
export function useIsMobile() {
  const responsive = useResponsive();
  // During SSR or hydration, responsive is undefined — default to non-mobile.
  if (!responsive) return false;
  // md is true when width >= 768, so !md means mobile (<768px).
  return !responsive.md;
}
