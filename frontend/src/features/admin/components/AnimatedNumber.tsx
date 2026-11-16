"use client";

import { useEffect, useRef, useState } from "react";

const DURATION_MS = 900;

/**
 * A figure that counts up to its value, and from the old value to the new one
 * when it changes. Without motion (reduced-motion users) it just shows the value.
 */
export function AnimatedNumber({ value, format }: { value: number; format: (value: number) => string }) {
  const [shown, setShown] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = current.current;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = reduceMotion ? 1 : Math.min((now - start) / DURATION_MS, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      current.current = from + (value - from) * eased;
      setShown(current.current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <span className="tabular-nums">{format(Math.round(shown))}</span>;
}
