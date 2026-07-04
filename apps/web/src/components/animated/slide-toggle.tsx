'use client';

import { useAnimateMount } from '@/hooks/use-animate-mount';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

interface SlideToggleProps {
  open: boolean;
  children: React.ReactNode;
  className?: string;
}

export function SlideToggle({ open, children, className }: SlideToggleProps) {
  const [mounted, exiting] = useAnimateMount(open, { exitDuration: 200 });
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>(0);
  const measuredRef = useRef(false);

  const measure = useCallback(() => {
    if (innerRef.current) {
      const h = innerRef.current.scrollHeight;
      if (h > 0) {
        setHeight(h);
        measuredRef.current = true;
      }
    }
  }, []);

  // Measure synchronously before paint when initially mounted and open
  useLayoutEffect(() => {
    if (mounted && !measuredRef.current) {
      measure();
    }
  }, [mounted, measure]);

  // Re-measure when children change
  useEffect(() => {
    if (!mounted) return;
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure, children]);

  // Re-measure on resize
  useEffect(() => {
    if (!mounted) return;
    const ro = new ResizeObserver(measure);
    if (innerRef.current) {
      ro.observe(innerRef.current);
    }
    return () => ro.disconnect();
  }, [mounted, measure]);

  if (!mounted) return null;

  const isOpen = !exiting;

  return (
    <div
      className={className}
      style={{
        overflow: 'hidden',
        transition: 'height 200ms ease-out',
        height: isOpen ? height : 0,
      }}
    >
      <div ref={innerRef}>{children}</div>
    </div>
  );
}
