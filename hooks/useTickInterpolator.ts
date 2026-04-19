"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseTickInterpolatorOptions {
  durationMs?: number;
}

interface UseTickInterpolatorResult {
  displayCents: number;
  isRising: boolean;
  push: (newCents: number) => void;
}

interface AnimState {
  display: number;
  duration: number;
  from: number;
  raf: number | null;
  start: number | null;
  to: number;
}

export function useTickInterpolator(
  initialCents: number,
  options: UseTickInterpolatorOptions = {},
): UseTickInterpolatorResult {
  const { durationMs = 950 } = options;

  const [displayCents, setDisplayCents] = useState(initialCents);
  const [isRising, setIsRising] = useState(true);

  // All mutable animation state lives in a single ref; never touched during render
  const stateRef = useRef<AnimState>({
    display: initialCents,
    duration: durationMs,
    from: initialCents,
    raf: null,
    start: null,
    to: initialCents,
  });

  // Keep duration in sync via effect (not inline during render)
  useEffect(() => {
    stateRef.current.duration = durationMs;
  }, [durationMs]);

  const push = useCallback((newCents: number) => {
    const s = stateRef.current;

    setIsRising(newCents >= s.to);

    if (s.raf !== null) {
      cancelAnimationFrame(s.raf);
      s.from = s.display;
    } else {
      s.from = s.to;
    }

    s.to = newCents;
    s.start = null;

    // animate is a local closure — self-references itself, no forward-ref needed
    const animate = (timestamp: number) => {
      if (s.start === null) s.start = timestamp;

      const progress = Math.min((timestamp - s.start) / s.duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      const interpolated = Math.round(s.from + (s.to - s.from) * eased);

      s.display = interpolated;
      setDisplayCents(interpolated);

      if (progress < 1) {
        s.raf = requestAnimationFrame(animate);
      } else {
        s.raf = null;
        s.start = null;
        s.from = s.to;
      }
    };

    s.raf = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const state = stateRef.current;
    return () => {
      if (state.raf !== null) cancelAnimationFrame(state.raf);
    };
  }, []);

  return { displayCents, isRising, push };
}
