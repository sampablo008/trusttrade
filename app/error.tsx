"use client";

import { RouteError } from "@/components/ui/RouteError";

// Next 16 renamed the recover callback to `unstable_retry`; keep `reset` as a
// fallback for compatibility.
export default function GlobalError({
  error,
  unstable_retry,
  reset,
}: {
  error: Error & { digest?: string };
  unstable_retry?: () => void;
  reset?: () => void;
}) {
  return (
    <main>
      <RouteError error={error} retry={unstable_retry ?? reset ?? (() => {})} fullScreen />
    </main>
  );
}
