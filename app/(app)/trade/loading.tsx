import { Skeleton } from "@/components/ui/Skeleton";

/** Loading scaffold that mirrors the real trade terminal layout (TradeShell). */
export default function Loading() {
  return (
    <main
      aria-busy="true"
      className="flex w-full flex-col gap-3 px-4 py-4 sm:px-6 lg:h-[calc(100dvh-3.75rem)] lg:overflow-hidden lg:px-16"
    >
      <span className="sr-only">Loading market data…</span>

      {/* Token chips */}
      <div className="flex shrink-0 gap-1.5 overflow-hidden pb-1">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-16 shrink-0 rounded-full" />
        ))}
      </div>

      {/* Market stats bar */}
      <Skeleton className="h-21 w-full shrink-0 rounded-2xl" />

      {/* Chart | order book + recent trades | order ticket */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row lg:items-stretch">
        {/* Chart + active positions */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Skeleton className="h-72 flex-none rounded-2xl sm:h-80 lg:h-auto lg:flex-1" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        </div>

        {/* Order book + recent trades */}
        <div className="hidden lg:flex lg:min-h-0 lg:w-64 lg:shrink-0 lg:flex-col lg:gap-3">
          <Skeleton className="min-h-0 flex-3 rounded-2xl" />
          <Skeleton className="min-h-0 flex-2 rounded-2xl" />
        </div>

        {/* Order ticket */}
        <div className="hidden lg:block lg:w-88 lg:shrink-0">
          <Skeleton className="h-full w-full rounded-2xl" />
        </div>
      </div>
    </main>
  );
}
