"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-down/30 bg-down/10">
        <AlertTriangle size={36} className="text-down" />
      </div>
      <div className="text-center">
        <h2 className="font-display text-2xl text-foreground">Something went wrong</h2>
        <p className="mt-2 text-sm text-muted">{error.message}</p>
        {error.digest && (
          <p className="mt-1 text-xs text-muted/60">Error ID: {error.digest}</p>
        )}
      </div>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-background transition hover:opacity-90"
      >
        Try again
      </button>
    </main>
  );
}
