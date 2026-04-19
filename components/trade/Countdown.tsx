"use client";

import { useEffect, useRef, useState } from "react";

interface CountdownProps {
  endTime: string;
  onExpire?: () => void;
}

const formatMs = (ms: number): string => {
  if (ms <= 0) return "0:00";
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

export default function Countdown({ endTime, onExpire }: CountdownProps) {
  const endMs = useRef(new Date(endTime).getTime());
  const [remainingMs, setRemainingMs] = useState(0);
  const expiredRef = useRef(false);

  useEffect(() => {
    endMs.current = new Date(endTime).getTime();
    expiredRef.current = false;
  }, [endTime]);

  useEffect(() => {
    const tick = () => {
      const remaining = endMs.current - Date.now();
      setRemainingMs(remaining);

      if (remaining <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire?.();
      }
    };

    // Compute immediately so first render shows correct time
    tick();
    // Use absolute end time — drift never accumulates
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [onExpire]);

  const isExpired = remainingMs <= 0;
  const isUrgent = remainingMs <= 10_000 && !isExpired;

  return (
    <span
      className={[
        "font-mono text-sm font-semibold tabular-nums transition-colors",
        isExpired ? "text-muted" : isUrgent ? "animate-pulse text-[hsl(var(--color-down))]" : "text-foreground",
      ].join(" ")}
    >
      {isExpired ? "Settling…" : formatMs(remainingMs)}
    </span>
  );
}
