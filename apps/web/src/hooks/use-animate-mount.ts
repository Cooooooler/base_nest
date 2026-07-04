'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type MountState = 'hidden' | 'mounted' | 'exiting';

interface UseAnimateMountOptions {
  /** Duration of the exit animation in ms */
  exitDuration?: number;
}

/**
 * Controls mount/unmount with CSS exit animation support.
 * Returns [mounted, isExiting]:
 * - set mounted to false to trigger exit animation
 * - component stays mounted for exitDuration ms, then unmounts
 */
export function useAnimateMount(
  visible: boolean,
  options?: UseAnimateMountOptions
): [mounted: boolean, isExiting: boolean] {
  const { exitDuration = 200 } = options ?? {};

  const [state, setState] = useState<MountState>(visible ? 'mounted' : 'hidden');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Cleanup timer on unmount
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  useEffect(() => {
    if (visible) {
      if (state !== 'mounted') {
        clearTimer();
        setState('mounted');
      }
    } else if (state === 'mounted') {
      setState('exiting');

      timerRef.current = setTimeout(() => {
        setState('hidden');
        timerRef.current = null;
      }, exitDuration);
    }

    // Do not react to state changes within the effect, only to visible changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, exitDuration, clearTimer]);

  return [state !== 'hidden', state === 'exiting'];
}
