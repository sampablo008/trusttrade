"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";

export type RouteErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
  title?: string;
  /** compact variant for in-page segments vs full-screen */
  fullScreen?: boolean;
};

/**
 * Shared error-boundary UI. Pair with a segment `error.tsx` that forwards
 * Next 16's `unstable_retry` as `retry`.
 */
export function RouteError({
  error,
  retry,
  title = "Something went wrong",
  fullScreen = false,
}: RouteErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      role="alert"
      className={
        fullScreen
          ? "flex min-h-screen flex-col items-center justify-center gap-6 px-4"
          : "flex flex-col items-center justify-center gap-5 rounded-2xl border border-border bg-surface px-4 py-16 text-center"
      }
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-down/30 bg-down/10">
        <AlertTriangle size={30} className="text-down" aria-hidden="true" />
      </div>
      <div className="text-center">
        <h2 className="font-display text-xl text-foreground">{title}</h2>
        <p className="mt-2 max-w-sm text-sm text-muted">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        {error.digest ? (
          <p className="mt-1 text-xs text-muted/60">Error ID: {error.digest}</p>
        ) : null}
      </div>
      <Button onClick={retry}>Try again</Button>
    </div>
  );
}
