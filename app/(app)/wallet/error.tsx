"use client";

import { RouteError } from "@/components/ui/RouteError";

export default function WalletError({
  error,
  unstable_retry,
  reset,
}: {
  error: Error & { digest?: string };
  unstable_retry?: () => void;
  reset?: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <RouteError
        error={error}
        retry={unstable_retry ?? reset ?? (() => {})}
        title="Couldn't load your wallet"
      />
    </div>
  );
}
