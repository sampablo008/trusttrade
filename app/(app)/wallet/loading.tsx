import { Skeleton } from "@/components/ui/Skeleton";

/** Loading scaffold mirroring the wallet layout. */
export default function Loading() {
  return (
    <main
      aria-busy="true"
      className="flex w-full flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-16"
    >
      <span className="sr-only">Loading wallet…</span>

      {/* Balance hero */}
      <Skeleton className="h-40 w-full rounded-2xl" />

      {/* Token balances */}
      <Skeleton className="h-32 w-full rounded-2xl" />

      {/* Deposits + withdrawals */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>

      {/* Bonus tickets */}
      <Skeleton className="h-40 w-full rounded-2xl" />

      {/* Transaction ledger */}
      <Skeleton className="h-72 w-full rounded-2xl" />
    </main>
  );
}
