"use client";

import { RouteError } from "@/components/ui/RouteError";

export default function AdminError({
  error,
  unstable_retry,
  reset,
}: {
  error: Error & { digest?: string };
  unstable_retry?: () => void;
  reset?: () => void;
}) {
  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <RouteError
        error={error}
        retry={unstable_retry ?? reset ?? (() => {})}
        title="Couldn't load this control panel"
      />
    </div>
  );
}
