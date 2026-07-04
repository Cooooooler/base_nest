'use client';

import { animated, useSpring } from 'react-spring';

interface CountUpProps {
  from?: number;
  to: number;
  duration?: number;
  delay?: number;
  className?: string;
}

function CountUp({ from = 0, to, duration = 1500, delay = 0 }: CountUpProps) {
  const { value } = useSpring({
    from: { value: from },
    to: { value: to },
    config: { duration },
    delay,
  });

  return <animated.span>{value.to((v) => Math.round(v))}</animated.span>;
}

export { CountUp };
